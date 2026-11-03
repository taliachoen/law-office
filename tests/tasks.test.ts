import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { createTask, getTaskDetail, listDeletedTasks, listTasks, restoreTask, runTaskCommand, updateTask } from "@/server/services/tasks";
import { TASK_STATUSES, type TaskStatus } from "@/shared/constants";
import { addDays, todayIso } from "@/shared/dates";
import { TASK_COMMANDS, availableCommands, canTransition, type TaskCommand } from "@/shared/task-flow";

const orgId = "test-org-tasks";
let manager: SessionUser;
let empA: SessionUser; // חבר בתיק, העובד המוקצה
let empC: SessionUser; // חבר בתיק, אבל לא המוקצה
let empB: SessionUser; // לא חבר בתיק
let caseId: string;
let closedCaseId: string;

beforeAll(async () => {
  const mk = async (name: string, role: "MANAGER" | "EMPLOYEE"): Promise<SessionUser> => {
    const u = await db.user.create({ data: { orgId, name, role, email: `${name}@tasks.test` } });
    return { id: u.id, orgId, name, role };
  };
  manager = await mk("מנהלת", "MANAGER");
  empA = await mk("עובד-א", "EMPLOYEE");
  empC = await mk("עובד-ג", "EMPLOYEE");
  empB = await mk("עובדת-ב", "EMPLOYEE");
  const client = await db.client.create({ data: { orgId, type: "PERSON", fullName: "לקוח" } });
  const mkCase = (n: string, status: string, members: string[]) =>
    db.case.create({
      data: {
        orgId, clientId: client.id, title: `תיק ${n}`, internalNumber: n, caseType: "DIVORCE",
        responsibleUserId: manager.id, status, members: { create: members.map((userId) => ({ orgId, userId })) },
      },
    });
  caseId = (await mkCase("T-1", "ACTIVE", [empA.id, empC.id])).id;
  closedCaseId = (await mkCase("T-2", "CLOSED", [empA.id])).id;
});

/** יוצר משימה ישירות במצב נתון (עוקף את השירות כדי לבדוק כל מצב). */
async function mkTask(status: TaskStatus, over: { assigneeId?: string | null; dueDate?: string } = {}) {
  const assigneeId = over.assigneeId === undefined ? (status === "OPEN" ? null : empA.id) : over.assigneeId;
  return db.task.create({
    data: { orgId, caseId, title: `משימה ${status}`, priority: "NORMAL", status, assigneeId, createdById: manager.id, dueDate: over.dueDate ?? null },
  });
}
const current = (id: string) => db.task.findUniqueOrThrow({ where: { id } });
async function run(user: SessionUser, id: string, command: TaskCommand, extra: { text?: string; assigneeId?: string; version?: number } = {}) {
  const { version } = await current(id);
  return runTaskCommand(user, { taskId: id, command, version, ...extra });
}
const counts = async (id: string) => ({
  events: await db.taskEvent.count({ where: { taskId: id } }),
  audit: await db.auditEvent.count({ where: { entityId: id, entityType: "Task" } }),
});

describe("מכונת המצבים (טבלת סעיף 7, כתובה ידנית)", () => {
  const EXPECTED: Record<TaskCommand, TaskStatus[]> = {
    ASSIGN: ["OPEN"],
    SUBMIT: ["ASSIGNED", "CHANGES_REQUESTED"],
    REQUEST_CHANGES: ["IN_REVIEW"],
    COMPLETE: ["IN_REVIEW", "ASSIGNED", "OPEN"],
    REOPEN: ["COMPLETED"],
    DELETE: [...TASK_STATUSES],
  };
  it("כל פקודה חוקית רק מהמצבים שבמפרט", () => {
    for (const command of TASK_COMMANDS) {
      for (const status of TASK_STATUSES) {
        expect(canTransition(command, status), `${command} מ-${status}`).toBe(EXPECTED[command].includes(status));
      }
    }
  });
  it("כפתורים לפי מצב ותפקיד", () => {
    const mgr = { isManager: true, isAssignee: false };
    const assignee = { isManager: false, isAssignee: true };
    const other = { isManager: false, isAssignee: false };
    expect(availableCommands("OPEN", mgr)).toEqual(["ASSIGN", "COMPLETE", "DELETE"]);
    expect(availableCommands("IN_REVIEW", mgr)).toEqual(["REQUEST_CHANGES", "COMPLETE", "DELETE"]);
    expect(availableCommands("CHANGES_REQUESTED", mgr)).toEqual(["DELETE"]);
    expect(availableCommands("COMPLETED", mgr)).toEqual(["REOPEN", "DELETE"]);
    expect(availableCommands("ASSIGNED", assignee)).toEqual(["SUBMIT"]);
    expect(availableCommands("CHANGES_REQUESTED", assignee)).toEqual(["SUBMIT"]);
    expect(availableCommands("IN_REVIEW", assignee)).toEqual([]);
    for (const status of TASK_STATUSES) expect(availableCommands(status, other)).toEqual([]);
  });
});

describe("OPEN -> ASSIGNED", () => {
  it("מעדכן את אותה משימה, כותב TaskEvent ו-Audit, ומעלה גרסה", async () => {
    const t = await mkTask("OPEN");
    const before = await counts(t.id);
    await run(manager, t.id, "ASSIGN", { assigneeId: empA.id });
    const after = await current(t.id);
    expect(after).toMatchObject({ id: t.id, status: "ASSIGNED", assigneeId: empA.id, version: 2 });
    expect(await db.task.count({ where: { orgId, title: t.title } })).toBe(1);
    expect(await counts(t.id)).toEqual({ events: before.events + 1, audit: before.audit + 1 });
    const ev = await db.taskEvent.findFirstOrThrow({ where: { taskId: t.id } });
    expect(ev).toMatchObject({ type: "ASSIGNED", actorId: manager.id });
  });
  it("עובד לא יכול; עובד שאינו חבר בתיק, או בלי בחירה, נדחים", async () => {
    const t = await mkTask("OPEN");
    await expect(run(empA, t.id, "ASSIGN", { assigneeId: empA.id })).rejects.toThrow(ForbiddenError);
    await expect(run(manager, t.id, "ASSIGN", { assigneeId: empB.id })).rejects.toThrow(ValidationError);
    await expect(run(manager, t.id, "ASSIGN", { assigneeId: manager.id })).rejects.toThrow(ValidationError);
    await expect(run(manager, t.id, "ASSIGN")).rejects.toThrow(ValidationError);
    expect((await current(t.id)).status).toBe("OPEN");
  });
});

describe("הגשה לבדיקה", () => {
  it.each(["ASSIGNED", "CHANGES_REQUESTED"] as const)("העובד המוקצה מגיש מ-%s עם הערה", async (status) => {
    const t = await mkTask(status);
    await run(empA, t.id, "SUBMIT", { text: "הוכן" });
    expect(await current(t.id)).toMatchObject({ status: "IN_REVIEW", version: 2 });
    expect((await db.taskEvent.findFirstOrThrow({ where: { taskId: t.id } })).note).toBe("הוכן");
  });
  it("בלי הערה (או עם רווחים בלבד) נדחית", async () => {
    const t = await mkTask("ASSIGNED");
    await expect(run(empA, t.id, "SUBMIT")).rejects.toThrow("הערת מענה");
    await expect(run(empA, t.id, "SUBMIT", { text: "   " })).rejects.toThrow("הערת מענה");
    expect((await current(t.id)).status).toBe("ASSIGNED");
  });
  it("עובד שאינו המוקצה, חבר או לא חבר בתיק, נדחה", async () => {
    const t = await mkTask("ASSIGNED");
    await expect(run(empC, t.id, "SUBMIT", { text: "x" })).rejects.toThrow(ForbiddenError);
    await expect(run(empB, t.id, "SUBMIT", { text: "x" })).rejects.toThrow(ForbiddenError);
  });
});

describe("IN_REVIEW -> CHANGES_REQUESTED / COMPLETED", () => {
  it("החזרה לתיקון: מנהלת עם הערה; בלי הערה או על ידי עובד נדחית", async () => {
    const t = await mkTask("IN_REVIEW");
    await expect(run(manager, t.id, "REQUEST_CHANGES")).rejects.toThrow("הערת תיקון");
    await expect(run(empA, t.id, "REQUEST_CHANGES", { text: "x" })).rejects.toThrow(ForbiddenError);
    await run(manager, t.id, "REQUEST_CHANGES", { text: "לתקן סעיף 3" });
    expect((await current(t.id)).status).toBe("CHANGES_REQUESTED");
  });
  it("סיום: חובה סיכום, ונשמר במשימה", async () => {
    const t = await mkTask("IN_REVIEW");
    await expect(run(manager, t.id, "COMPLETE")).rejects.toThrow("סיכום ביצוע");
    await expect(run(empA, t.id, "COMPLETE", { text: "x" })).rejects.toThrow(ForbiddenError);
    await run(manager, t.id, "COMPLETE", { text: "הוגש לבית המשפט" });
    expect(await current(t.id)).toMatchObject({ status: "COMPLETED", completionSummary: "הוגש לבית המשפט" });
  });
  it.each(["ASSIGNED", "OPEN"] as const)("סיום ישיר מ-%s", async (status) => {
    const t = await mkTask(status);
    await run(manager, t.id, "COMPLETE", { text: "בוצע" });
    expect((await current(t.id)).status).toBe("COMPLETED");
  });
  it("סיום מ-CHANGES_REQUESTED אינו מותר", async () => {
    const t = await mkTask("CHANGES_REQUESTED");
    await expect(run(manager, t.id, "COMPLETE", { text: "x" })).rejects.toThrow(ValidationError);
  });
});

describe("פתיחה מחדש", () => {
  it("בלי סיבה נדחית; עם סיבה חוזרת ל-OPEN, וההיסטוריה נשמרת", async () => {
    const t = await mkTask("ASSIGNED");
    await run(manager, t.id, "COMPLETE", { text: "סיכום ראשון" });
    const eventsBefore = (await counts(t.id)).events;
    await expect(run(manager, t.id, "REOPEN")).rejects.toThrow("סיבה");
    await expect(run(empA, t.id, "REOPEN", { text: "x" })).rejects.toThrow(ForbiddenError);
    await run(manager, t.id, "REOPEN", { text: "נמצאה טעות" });
    expect(await current(t.id)).toMatchObject({ status: "OPEN", assigneeId: null, completionSummary: null });
    expect((await counts(t.id)).events).toBe(eventsBefore + 1);
    const types = (await db.taskEvent.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "asc" } })).map((e) => e.type);
    expect(types).toContain("COMPLETED"); // האירוע הישן לא נמחק
  });
  it("עם עובד חוזרת ל-ASSIGNED", async () => {
    const t = await mkTask("COMPLETED");
    await run(manager, t.id, "REOPEN", { text: "המשך טיפול", assigneeId: empC.id });
    expect(await current(t.id)).toMatchObject({ status: "ASSIGNED", assigneeId: empC.id });
  });
});

describe("מעברים לא חוקיים נדחים בשירות גם כשנשלחים ישירות", () => {
  it("אין שינוי ואין אירועים", async () => {
    const cases: [TaskStatus, TaskCommand, SessionUser][] = [
      ["OPEN", "SUBMIT", manager],
      ["ASSIGNED", "REQUEST_CHANGES", manager],
      ["IN_REVIEW", "ASSIGN", manager],
      ["COMPLETED", "COMPLETE", manager],
      ["IN_REVIEW", "REOPEN", manager],
      ["IN_REVIEW", "SUBMIT", empA],
    ];
    for (const [status, command, actor] of cases) {
      const t = await mkTask(status);
      const before = await counts(t.id);
      await expect(run(actor, t.id, command, { text: "טקסט", assigneeId: empA.id }), `${command} על ${status}`).rejects.toThrow(ValidationError);
      expect((await current(t.id)).version).toBe(1);
      expect(await counts(t.id)).toEqual(before);
    }
  });
});

describe("נעילה אופטימית", () => {
  it("גרסה ישנה נדחית בהודעה הנדרשת, ואין שינוי", async () => {
    const t = await mkTask("OPEN");
    await run(manager, t.id, "ASSIGN", { assigneeId: empA.id }); // הגרסה עולה ל-2
    const before = await counts(t.id);
    await expect(runTaskCommand(manager, { taskId: t.id, command: "COMPLETE", version: 1, text: "x" })).rejects.toThrow(
      new ConflictError("המשימה עודכנה בחלון אחר. רעננו את הדף."),
    );
    expect((await current(t.id)).status).toBe("ASSIGNED");
    expect(await counts(t.id)).toEqual(before);
  });
  it("שתי פעולות עם אותה גרסה: רק הראשונה מצליחה", async () => {
    const t = await mkTask("IN_REVIEW");
    const results = await Promise.allSettled([
      runTaskCommand(manager, { taskId: t.id, command: "COMPLETE", version: 1, text: "א" }),
      runTaskCommand(manager, { taskId: t.id, command: "REQUEST_CHANGES", version: 1, text: "ב" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await current(t.id)).version).toBe(2);
    expect((await db.taskEvent.count({ where: { taskId: t.id } }))).toBe(1);
  });
});

describe("מחיקה לסל ושחזור", () => {
  it.each(TASK_STATUSES)("מחיקה ושחזור מחזירים סטטוס %s", async (status) => {
    const t = await mkTask(status);
    await run(manager, t.id, "DELETE");
    const deleted = await current(t.id);
    expect(deleted).toMatchObject({ statusBeforeTrash: status, deletedById: manager.id });
    expect(deleted.deletedAt).not.toBeNull();
    expect((await listTasks(manager)).map((x) => x.id)).not.toContain(t.id);
    await expect(getTaskDetail(manager, t.id)).rejects.toThrow(NotFoundError);
    expect((await listDeletedTasks(manager)).map((x) => x.id)).toContain(t.id);

    await restoreTask(manager, t.id);
    expect(await current(t.id)).toMatchObject({ status, statusBeforeTrash: null, deletedAt: null, deletedById: null });
    expect((await listTasks(manager)).map((x) => x.id)).toContain(t.id);
    const types = (await db.taskEvent.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "asc" } })).map((e) => e.type);
    expect(types).toEqual(["DELETED", "RESTORED"]);
  });
  it("מסמכים מקושרים לא נמחקים עם המשימה וחוזרים איתה", async () => {
    const t = await mkTask("ASSIGNED");
    const doc = await db.document.create({ data: { orgId, caseId, taskId: t.id, title: "מסמך", source: "UPLOAD", createdById: manager.id } });
    await run(manager, t.id, "DELETE");
    expect((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).deletedAt).toBeNull();
    await restoreTask(manager, t.id);
    expect((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).taskId).toBe(t.id);
  });
  it("עובד לא מוחק, לא משחזר ולא רואה את הסל; שחזור של משימה שלא נמחקה נדחה", async () => {
    const t = await mkTask("ASSIGNED");
    await expect(run(empA, t.id, "DELETE")).rejects.toThrow(ForbiddenError);
    await expect(listDeletedTasks(empA)).rejects.toThrow(ForbiddenError);
    await expect(restoreTask(empA, t.id)).rejects.toThrow(ForbiddenError);
    await expect(restoreTask(manager, t.id)).rejects.toThrow(NotFoundError);
    await run(manager, t.id, "DELETE");
    await expect(restoreTask(empA, t.id)).rejects.toThrow(ForbiddenError);
  });
});

describe("הרשאות קריאה", () => {
  it("עובד לא רואה משימות של תיק שאינו חבר בו", async () => {
    const t = await mkTask("ASSIGNED");
    expect((await listTasks(empA)).map((x) => x.id)).toContain(t.id);
    expect((await listTasks(empB)).map((x) => x.id)).not.toContain(t.id);
    await expect(getTaskDetail(empB, t.id)).rejects.toThrow(ForbiddenError);
    await expect(run(empB, t.id, "COMPLETE", { text: "x" })).rejects.toThrow(ForbiddenError);
    await expect(getTaskDetail(empA, t.id)).resolves.toBeTruthy();
  });
});

describe("רשימות ולשוניות", () => {
  it("פתוחות / שלי / לבדיקה / הושלמו / באיחור", async () => {
    const today = todayIso();
    const late = await mkTask("ASSIGNED", { dueDate: addDays(today, -2) });
    const review = await mkTask("IN_REVIEW", { assigneeId: empC.id });
    const done = await mkTask("COMPLETED", { dueDate: addDays(today, -9) });
    const ids = async (filters: Parameters<typeof listTasks>[1], u = manager) => (await listTasks(u, filters)).map((t) => t.id);

    expect(await ids({ tab: "open" })).toEqual(expect.arrayContaining([late.id, review.id]));
    expect(await ids({ tab: "open" })).not.toContain(done.id);
    expect(await ids({ tab: "mine" }, empC)).toContain(review.id);
    expect(await ids({ tab: "mine" }, empC)).not.toContain(late.id);
    expect(await ids({ tab: "review" })).toContain(review.id);
    expect(await ids({ tab: "review" })).not.toContain(late.id);
    expect(await ids({ tab: "done" })).toContain(done.id);
    expect(await ids({ overdue: true })).toContain(late.id);
    expect(await ids({ overdue: true })).not.toContain(done.id); // הושלמה, אז לא "באיחור"
  });
});

describe("createTask", () => {
  const base = () => ({ caseId, title: "משימה חדשה", priority: "NORMAL" as const });
  it("נוצרת OPEN, או ASSIGNED עם עובד (ושני אירועים)", async () => {
    const open = await createTask(manager, base());
    expect((await current(open.id)).status).toBe("OPEN");
    expect(await counts(open.id)).toEqual({ events: 1, audit: 1 });
    const assigned = await createTask(manager, { ...base(), assigneeId: empA.id, dueDate: "2026-12-31" });
    expect(await current(assigned.id)).toMatchObject({ status: "ASSIGNED", assigneeId: empA.id, dueDate: "2026-12-31" });
    expect((await counts(assigned.id)).events).toBe(2);
  });
  it("עובד, תיק סגור, ועובד שאינו בתיק נדחים", async () => {
    await expect(createTask(empA, base())).rejects.toThrow(ForbiddenError);
    await expect(createTask(manager, { ...base(), caseId: closedCaseId })).rejects.toThrow("תיק סגור");
    await expect(createTask(manager, { ...base(), assigneeId: empB.id })).rejects.toThrow(ValidationError);
    await expect(createTask(manager, { ...base(), caseId: "nope" })).rejects.toThrow(ValidationError);
  });
});

describe('updateTask – עריכת פרטים', () => {
  const edit = async (user: SessionUser, id: string, over: Record<string, unknown> = {}) => {
    const { version } = await current(id);
    return updateTask(user, { taskId: id, version, title: 'כותרת חדשה', priority: 'HIGH', instructions: 'הוראות חדשות', dueDate: '2026-12-01', ...over } as Parameters<typeof updateTask>[1]);
  };

  it('מעדכנת פרטים בלבד: סטטוס ועובד נשארים, הגרסה עולה, ונכתבים TaskEvent ו-Audit', async () => {
    const t = await mkTask('IN_REVIEW');
    const before = await counts(t.id);
    await edit(manager, t.id);
    const after = await current(t.id);
    expect(after).toMatchObject({ title: 'כותרת חדשה', priority: 'HIGH', instructions: 'הוראות חדשות', dueDate: '2026-12-01', status: 'IN_REVIEW', assigneeId: empA.id, version: 2 });
    expect(await counts(t.id)).toEqual({ events: before.events + 1, audit: before.audit + 1 });
    const ev = await db.taskEvent.findFirstOrThrow({ where: { taskId: t.id, type: 'UPDATED' } });
    expect(ev).toMatchObject({ actorId: manager.id });
    expect(ev.note).toContain('כותרת');
    const audit = await db.auditEvent.findFirstOrThrow({ where: { entityId: t.id, action: 'UPDATE' } });
    expect(audit.caseId).toBe(caseId);
  });

  it('מותרת בכל מצב, גם על משימה שהושלמה', async () => {
    for (const status of TASK_STATUSES) {
      const t = await mkTask(status);
      await edit(manager, t.id);
      expect((await current(t.id)).status).toBe(status);
    }
  });

  it('שדה ריק מנקה הוראות ומועד יעד', async () => {
    const t = await mkTask('OPEN', { dueDate: '2026-11-30' });
    await edit(manager, t.id, { instructions: undefined, dueDate: undefined });
    expect(await current(t.id)).toMatchObject({ instructions: null, dueDate: null });
  });

  it('בלי שינוי בפועל: לא עולה גרסה ולא נכתב אירוע', async () => {
    const t = await mkTask('OPEN');
    await edit(manager, t.id, { title: t.title, priority: t.priority, instructions: undefined, dueDate: undefined });
    expect((await current(t.id)).version).toBe(1);
    expect((await counts(t.id))).toEqual({ events: 0, audit: 0 });
  });

  it('גרסה ישנה נדחית בהודעה הנדרשת ולא משנה דבר', async () => {
    const t = await mkTask('ASSIGNED');
    await edit(manager, t.id); // גרסה 2
    const before = await counts(t.id);
    await expect(updateTask(manager, { taskId: t.id, version: 1, title: 'ישן', priority: 'LOW' })).rejects.toThrow(
      new ConflictError('המשימה עודכנה בחלון אחר. רעננו את הדף.'),
    );
    expect((await current(t.id)).title).toBe('כותרת חדשה');
    expect(await counts(t.id)).toEqual(before);
  });

  it('עובד (גם המוקצה, גם חבר בתיק) ועובד מחוץ לתיק נדחים', async () => {
    const t = await mkTask('ASSIGNED');
    const before = await counts(t.id);
    await expect(edit(empA, t.id)).rejects.toThrow(ForbiddenError);
    await expect(edit(empB, t.id)).rejects.toThrow(ForbiddenError);
    expect((await current(t.id)).version).toBe(1);
    expect(await counts(t.id)).toEqual(before);
  });

  it('משימה שנמחקה (בסל) או שלא קיימת: NotFound', async () => {
    const t = await mkTask('OPEN');
    await run(manager, t.id, 'DELETE');
    await expect(updateTask(manager, { taskId: t.id, version: 2, title: 'שם', priority: 'LOW' })).rejects.toThrow(NotFoundError);
    await expect(updateTask(manager, { taskId: 'nope', version: 1, title: 'שם', priority: 'LOW' })).rejects.toThrow(NotFoundError);
  });
});
