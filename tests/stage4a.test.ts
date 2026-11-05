import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { ACTIONS, can, caseScope, clientScope, inboxScope, type Action } from "@/server/policy";
import { createCase, getCaseHistory, setCaseBlockers, setCaseMembers, updateCase } from "@/server/services/cases";
import {
  createNote, deleteNote, latestNotes, listDeletedNotes, listNotes, restoreNote, updateNote,
} from "@/server/services/case-notes";
import { createClient, deleteClient, getClientDetail, listClients, updateClient } from "@/server/services/clients";
import {
  createTask, getTeamWorkload, listDeletedTasks, listTasks, restoreTask, runTaskCommand,
} from "@/server/services/tasks";
import { TASK_STATUSES, type TaskStatus } from "@/shared/constants";
import { addDays, dateToIsraelLocal, israelLocalToDate, todayIso, weekdayOf } from "@/shared/dates";
import { parseTaskFilters } from "@/shared/task-filters";
import { taskHolderId } from "@/shared/task-flow";

const orgId = "test-org-4a";
let manager: SessionUser;
let empA: SessionUser; // חבר בתיק א בלבד
let empB: SessionUser; // חבר בתיק ב בלבד
let secretary: SessionUser;
let caseA: string;
let caseB: string;
let clientId: string;

const today = todayIso();

beforeAll(async () => {
  const mk = async (name: string, role: "MANAGER" | "EMPLOYEE" | "SECRETARY"): Promise<SessionUser> => {
    const u = await db.user.create({ data: { orgId, name, role, email: `${name}@4a.test` } });
    return { id: u.id, orgId, name, role };
  };
  manager = await mk("מנהלת", "MANAGER");
  empA = await mk("עובד-א", "EMPLOYEE");
  empB = await mk("עובדת-ב", "EMPLOYEE");
  secretary = await mk("מזכירה", "SECRETARY");
  await db.lookupOption.createMany({
    data: [
      { orgId, list: "CASE_TYPE", code: "DIVORCE", label: "גירושין" },
      { orgId, list: "CONTACT_STATUS", code: "ACTIVE", label: "פעיל" },
      { orgId, list: "CONTACT_STATUS", code: "AWAITING_CLIENT", label: "ממתין לתגובת הלקוח" },
    ],
  });
  clientId = (await db.client.create({ data: { orgId, type: "PERSON", fullName: "לקוח" } })).id;
  const mkCase = (n: string, members: string[]) =>
    db.case.create({
      data: {
        orgId, clientId, title: `תיק ${n}`, internalNumber: n, caseType: "DIVORCE", responsibleUserId: manager.id,
        status: "ACTIVE", members: { create: members.map((userId) => ({ orgId, userId })) },
      },
    });
  caseA = (await mkCase("4A-1", [empA.id])).id;
  caseB = (await mkCase("4A-2", [empB.id])).id;
});

// ---------------------------------------------------------------- מזכירות
describe("תפקיד מזכירות – טבלת ההרשאות (can)", () => {
  const ALLOWED: Action[] = [
    "client:read", "case:read", "task:read", "document:read", "document:upload", "inbox:add",
    "deadline:read", "deadline:write", "client:write", "case:write", "note:read", "note:create",
  ];
  const DENIED = ACTIONS.filter((a) => !ALLOWED.includes(a) && a !== "note:edit" && a !== "inbox:read");

  it("מורשית בפעולות של הטבלה, בכל תיק ובלי להיות חברה בו", () => {
    for (const action of ALLOWED) expect(can(secretary, action, { orgId }), action).toBe(true);
  });
  it("נדחית בכל פעולה אחרת: שיוך, משימות, חסמים, אימות מועד, צפיתי ומחיקה, סל, הגדרות", () => {
    for (const action of DENIED) expect(can(secretary, action, { orgId }), action).toBe(false);
    for (const a of ["case:assign-members", "case:edit-blockers", "task:create", "task:assign", "task:review", "task:submit",
      "inbox:mark-viewed", "inbox:delete", "deadline:verify", "note:delete", "client:write-delete", "trash:view", "trash:restore",
      "settings:manage"] as const) {
      expect(DENIED, a).toContain(a);
    }
  });
  it("חומר חדש בלי תיק: מוסיפה, ורואה רק את מה שהוסיפה בעצמה", () => {
    expect(can(secretary, "inbox:add", { orgId, caseless: true })).toBe(true);
    expect(can(secretary, "inbox:read", { orgId, caseless: true, createdById: secretary.id })).toBe(true);
    expect(can(secretary, "inbox:read", { orgId, caseless: true, createdById: empA.id })).toBe(false);
  });
  it("לא מורשית בארגון אחר", () => {
    expect(can(secretary, "case:read", { orgId: "other" })).toBe(false);
  });
  it("רואה את כל התיקים והלקוחות (scope), וחומר חדש בלי תיק רק של עצמה", () => {
    expect(caseScope(secretary)).toEqual({ orgId, deletedAt: null });
    expect(clientScope(secretary)).toEqual({ orgId, deletedAt: null });
    expect(inboxScope(secretary)).toMatchObject({ OR: [{ case: { orgId, deletedAt: null } }, { caseId: null, createdById: secretary.id }] });
  });
});

describe("תפקיד מזכירות – ניסיונות ישירים לשירותים", () => {
  it("רואה את כל התיקים והמשימות, לקריאה בלבד", async () => {
    const t = await db.task.create({
      data: { orgId, caseId: caseB, title: "משימה לקריאה", priority: "NORMAL", status: "OPEN", createdById: manager.id },
    });
    expect((await listTasks(secretary, {})).map((x) => x.id)).toContain(t.id);
    const detail = await getClientDetail(secretary, clientId);
    expect(detail.cases.map((c) => c.id).sort()).toEqual([caseA, caseB].sort());
  });

  it("אינה יכולה ליצור משימה, להעביר, להגיש, לסיים או למחוק", async () => {
    await expect(createTask(secretary, { caseId: caseA, title: "משימה", priority: "NORMAL" })).rejects.toThrow(ForbiddenError);
    const t = await db.task.create({
      data: { orgId, caseId: caseA, title: "משימה", priority: "NORMAL", status: "ASSIGNED", assigneeId: empA.id, createdById: manager.id },
    });
    for (const command of ["ASSIGN", "SUBMIT", "REQUEST_CHANGES", "COMPLETE", "REOPEN", "DELETE"] as const) {
      await expect(
        runTaskCommand(secretary, { taskId: t.id, command, version: t.version, text: "טקסט", assigneeId: empA.id }),
        command,
      ).rejects.toThrow(ForbiddenError);
    }
  });

  it("אינה יכולה לשייך עובדים, לערוך חסמים, למחוק לקוח, לראות סל או לשחזר", async () => {
    await expect(setCaseMembers(secretary, caseA, [empA.id])).rejects.toThrow(ForbiddenError);
    const c = await db.case.findUniqueOrThrow({ where: { id: caseA } });
    await expect(setCaseBlockers(secretary, { caseId: caseA, version: c.version, blockers: "x" })).rejects.toThrow(ForbiddenError);
    const lonely = await db.client.create({ data: { orgId, type: "PERSON", fullName: "לקוח בלי תיקים" } });
    await expect(deleteClient(secretary, lonely.id)).rejects.toThrow(ForbiddenError);
    await expect(listDeletedTasks(secretary)).rejects.toThrow(ForbiddenError);
    await expect(listDeletedNotes(secretary)).rejects.toThrow(ForbiddenError);
    await expect(restoreTask(secretary, "x")).rejects.toThrow(ForbiddenError);
    await expect(restoreNote(secretary, "x")).rejects.toThrow(ForbiddenError);
    await expect(getTeamWorkload(secretary)).rejects.toThrow(ForbiddenError);
  });

  it("יוצרת ועורכת לקוח ותיק, ובלי לגעת בחסמים", async () => {
    const created = await createClient(secretary, { type: "PERSON", fullName: "לקוח מהמזכירה", contactStatus: "AWAITING_CLIENT" });
    await updateClient(secretary, created.id, { type: "PERSON", fullName: "לקוח מהמזכירה", phone: "050-1112222" });
    const row = await db.client.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.phone).toBe("050-1112222");
    expect(row.contactStatus).toBe("AWAITING_CLIENT"); // לא נשלח בעדכון: נשמר

    const c = await createCase(secretary, {
      clientId: created.id, title: "תיק מהמזכירה", caseType: "DIVORCE", responsibleUserId: manager.id, status: "ACTIVE",
    });
    const before = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    await updateCase(secretary, c.id, {
      title: "תיק מהמזכירה (עודכן)", caseType: "DIVORCE", responsibleUserId: manager.id, status: "ACTIVE", version: before.version,
    });
    const after = await db.case.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.title).toBe("תיק מהמזכירה (עודכן)");
    expect(after.blockers).toBeNull();
  });

  it("לא יכולה להיות אחראית על תיק", async () => {
    await expect(
      createCase(manager, { clientId, title: "תיק", caseType: "DIVORCE", responsibleUserId: secretary.id, status: "ACTIVE" }),
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------- תיעוד בתיק
describe("תיעוד בתיק", () => {
  it("כל מי שמורשה לתיק יוצר, ומי שאינו מורשה נדחה (יצירה וקריאה)", async () => {
    const n = await createNote(empA, { caseId: caseA, kind: "CALL", body: "שיחה עם הלקוח" });
    expect(n.id).toBeTruthy();
    await createNote(secretary, { caseId: caseA, kind: "NOTE", body: "הערת מזכירה" });
    await createNote(manager, { caseId: caseA, kind: "MEETING", body: "פגישה", participants: "הלקוח ובעלו" });
    await expect(createNote(empB, { caseId: caseA, kind: "NOTE", body: "לא שלי" })).rejects.toThrow(ForbiddenError);
    await expect(listNotes(empB, caseA)).rejects.toThrow(ForbiddenError);
    await expect(createNote(empA, { caseId: "no-such", kind: "NOTE", body: "x" })).rejects.toThrow(NotFoundError);
  });

  it("יצירה כותבת AuditEvent עם caseId, והתיעוד מופיע בהיסטוריית התיק", async () => {
    const audit = await db.auditEvent.findMany({ where: { orgId, entityType: "CaseNote", caseId: caseA, action: "CREATE" } });
    expect(audit.length).toBeGreaterThanOrEqual(3);
    const history = await getCaseHistory(manager, caseA);
    expect(history.some((e) => e.summary.includes("נוסף תיעוד"))).toBe(true);
  });

  it("הרשימה ממוינת לפי occurredAt (חדש למעלה) ומסוננת לפי סוג", async () => {
    const old = await createNote(manager, { caseId: caseB, kind: "CALL", body: "ישן", occurredAt: dateToIsraelLocal(new Date(Date.now() - 5 * 86400000)) });
    const recent = await createNote(manager, { caseId: caseB, kind: "NOTE", body: "חדש" });
    const all = await listNotes(manager, caseB);
    expect(all.map((n) => n.id)).toEqual([recent.id, old.id]);
    expect((await listNotes(manager, caseB, { kind: "CALL" })).map((n) => n.id)).toEqual([old.id]);
    expect((await listNotes(manager, caseB, { kind: "garbage" })).length).toBe(2);
  });

  it("latestNotes מחזיר שלושה", async () => {
    for (let i = 0; i < 3; i++) await createNote(manager, { caseId: caseB, kind: "NOTE", body: `עוד ${i}` });
    expect((await latestNotes(manager, caseB)).length).toBe(3);
  });

  it("אירוע מהעתיד נדחה; שעת ישראל מומרת נכון", async () => {
    const future = dateToIsraelLocal(new Date(Date.now() + 3 * 86400000));
    await expect(createNote(manager, { caseId: caseA, kind: "NOTE", body: "x", occurredAt: future })).rejects.toThrow(ValidationError);
    for (const local of ["2026-01-15T09:30", "2026-07-15T09:30", "2026-03-27T01:30", "2026-10-25T00:30"]) {
      expect(dateToIsraelLocal(israelLocalToDate(local))).toBe(local);
    }
    expect(israelLocalToDate("2026-01-15T09:30").toISOString()).toBe("2026-01-15T07:30:00.000Z"); // חורף: UTC+2
    expect(israelLocalToDate("2026-07-15T09:30").toISOString()).toBe("2026-07-15T06:30:00.000Z"); // קיץ: UTC+3
  });

  it("עריכה: היוצר תוך 24 שעות; לא אחר; לא אחרי 24 שעות; מנהלת תמיד", async () => {
    const mine = await createNote(empA, { caseId: caseA, kind: "NOTE", body: "מקורי" });
    const row = () => db.caseNote.findUniqueOrThrow({ where: { id: mine.id } });
    const edit = (user: SessionUser, body: string, version?: number) =>
      updateNote(user, { noteId: mine.id, kind: "NOTE", body, version: version ?? 0 });

    await edit(empA, "נערך", (await row()).version);
    expect((await row()).body).toBe("נערך");
    await expect(edit(secretary, "ניסיון", (await row()).version)).rejects.toThrow(ForbiddenError); // לא היוצרת
    await expect(edit(empB, "ניסיון", (await row()).version)).rejects.toThrow(ForbiddenError); // לא חבר בתיק

    await db.caseNote.update({ where: { id: mine.id }, data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) } });
    await expect(edit(empA, "מאוחר מדי", (await row()).version)).rejects.toThrow(ForbiddenError);
    await edit(manager, "המנהלת עורכת", (await row()).version);
    expect((await row()).body).toBe("המנהלת עורכת");
  });

  it("עריכה עם גרסה ישנה נדחית; עדכון כותב AuditEvent", async () => {
    const n = await createNote(manager, { caseId: caseA, kind: "NOTE", body: "גרסה" });
    await updateNote(manager, { noteId: n.id, kind: "NOTE", body: "גרסה 2", version: 1 });
    await expect(updateNote(manager, { noteId: n.id, kind: "NOTE", body: "ישן", version: 1 })).rejects.toThrow(ConflictError);
    expect(await db.auditEvent.count({ where: { entityId: n.id, action: "UPDATE" } })).toBe(1);
  });

  it("מחיקה לסל: מנהלת בלבד; מופיע בסל; שחזור מחזיר", async () => {
    const n = await createNote(empA, { caseId: caseA, kind: "NOTE", body: "למחיקה" });
    for (const u of [empA, secretary, empB]) await expect(deleteNote(u, n.id)).rejects.toThrow(ForbiddenError);
    await deleteNote(manager, n.id);
    expect((await listNotes(manager, caseA)).some((x) => x.id === n.id)).toBe(false);
    expect((await listDeletedNotes(manager)).some((x) => x.id === n.id)).toBe(true);
    await restoreNote(manager, n.id);
    expect((await listNotes(manager, caseA)).some((x) => x.id === n.id)).toBe(true);
    expect(await db.auditEvent.count({ where: { entityId: n.id, caseId: caseA } })).toBe(3); // יצירה, מחיקה, שחזור
  });

  it("canEdit / canDelete בתצוגה תואמים להרשאות", async () => {
    const rows = await listNotes(empA, caseA);
    const mine = rows.find((r) => r.createdById === empA.id)!;
    expect(mine.canEdit).toBe(true);
    expect(mine.canDelete).toBe(false);
    expect((await listNotes(manager, caseA)).every((r) => r.canEdit && r.canDelete)).toBe(true);
  });
});

// ---------------------------------------------------------------- חסמים וסטטוס קשר
describe("חסמים בתיק", () => {
  it("מנהלת מעדכנת עם נעילה אופטימית ו-AuditEvent; ריק מנקה", async () => {
    const c = await db.case.findUniqueOrThrow({ where: { id: caseA } });
    await setCaseBlockers(manager, { caseId: caseA, version: c.version, blockers: "ממתינים לתצהיר" });
    const after = await db.case.findUniqueOrThrow({ where: { id: caseA } });
    expect(after.blockers).toBe("ממתינים לתצהיר");
    expect(after.version).toBe(c.version + 1);
    await expect(setCaseBlockers(manager, { caseId: caseA, version: c.version, blockers: "ישן" })).rejects.toThrow(ConflictError);
    await setCaseBlockers(manager, { caseId: caseA, version: after.version, blockers: undefined });
    expect((await db.case.findUniqueOrThrow({ where: { id: caseA } })).blockers).toBeNull();
    expect(await db.auditEvent.count({ where: { entityId: caseA, action: "BLOCKERS" } })).toBe(2);
  });
  it("עובד לא יכול", async () => {
    const c = await db.case.findUniqueOrThrow({ where: { id: caseA } });
    await expect(setCaseBlockers(empA, { caseId: caseA, version: c.version, blockers: "x" })).rejects.toThrow(ForbiddenError);
  });
});

describe("סטטוס קשר ללקוח", () => {
  it("ברירת מחדל ACTIVE; קוד לא קיים נדחה; הרשימה מסוננת לפי סטטוס", async () => {
    const a = await createClient(manager, { type: "PERSON", fullName: "לקוח ברירת מחדל" });
    expect((await db.client.findUniqueOrThrow({ where: { id: a.id } })).contactStatus).toBe("ACTIVE");
    await expect(createClient(manager, { type: "PERSON", fullName: "לקוח לא תקין", contactStatus: "NOPE" })).rejects.toThrow(ValidationError);
    const b = await createClient(manager, { type: "PERSON", fullName: "לקוח ממתין", contactStatus: "AWAITING_CLIENT" });
    const waiting = await listClients(manager, { contactStatus: "AWAITING_CLIENT" });
    expect(waiting.map((c) => c.id)).toContain(b.id);
    expect(waiting.every((c) => c.contactStatus === "AWAITING_CLIENT")).toBe(true);
    expect(waiting.map((c) => c.id)).not.toContain(a.id);
  });
});

// ---------------------------------------------------------------- אצל מי עכשיו
describe("אצל מי עכשיו", () => {
  it("נכון בכל אחד מחמשת המצבים", () => {
    const base = { assigneeId: "emp", createdById: "mgr" };
    expect(taskHolderId({ ...base, status: "ASSIGNED" }, "mgr")).toBe("emp");
    expect(taskHolderId({ ...base, status: "CHANGES_REQUESTED" }, "mgr")).toBe("emp");
    expect(taskHolderId({ ...base, status: "IN_REVIEW" }, "mgr")).toBe("mgr");
    expect(taskHolderId({ ...base, status: "OPEN", assigneeId: null }, "mgr")).toBe("mgr"); // OPEN בלי מוקצה: היוצרת
    expect(taskHolderId({ ...base, status: "OPEN", assigneeId: "other" }, "mgr")).toBe("other"); // OPEN עם מוקצה: המוקצה
    expect(taskHolderId({ ...base, status: "COMPLETED" }, "mgr")).toBeNull();
    for (const s of TASK_STATUSES) expect(() => taskHolderId({ ...base, status: s }, "mgr")).not.toThrow();
  });

  it("משימה שנוצרת בלי עובד נשארת אצל המנהלת (OPEN, בלי אירוע העברה)", async () => {
    const created = await createTask(manager, { caseId: caseA, title: "אצלי", priority: "NORMAL" });
    const t = await db.task.findUniqueOrThrow({ where: { id: created.id }, include: { events: true } });
    expect(t.status).toBe("OPEN");
    expect(t.assigneeId).toBe(manager.id);
    expect(t.events.map((e) => e.type)).toEqual(["CREATED"]);
    // ועדיין אפשר להעביר אותה לעובד
    await runTaskCommand(manager, { taskId: t.id, command: "ASSIGN", version: t.version, assigneeId: empA.id });
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("ASSIGNED");
  });
});

// ---------------------------------------------------------------- סינון ועומס צוות
describe("סינון משימות ועומס צוות", () => {
  const org2 = "test-org-4a-load"; // ארגון נפרד, כדי שהספירות יהיו מדויקות
  let m: SessionUser;
  let e1: SessionUser;
  let e2: SessionUser;
  let sec: SessionUser;
  let c1: string;
  let c2: string;

  beforeAll(async () => {
    const mk = async (name: string, role: "MANAGER" | "EMPLOYEE" | "SECRETARY"): Promise<SessionUser> => {
      const u = await db.user.create({ data: { orgId: org2, name, role, email: `${name}@4a-load.test` } });
      return { id: u.id, orgId: org2, name, role };
    };
    m = await mk("מנהלת", "MANAGER");
    e1 = await mk("עובד-1", "EMPLOYEE");
    e2 = await mk("עובד-2", "EMPLOYEE");
    sec = await mk("מזכירה", "SECRETARY");
    const client = await db.client.create({ data: { orgId: org2, type: "PERSON", fullName: "לקוח" } });
    const mkCase = (n: string, members: string[]) =>
      db.case.create({
        data: {
          orgId: org2, clientId: client.id, title: `תיק ${n}`, internalNumber: n, caseType: "DIVORCE",
          responsibleUserId: m.id, status: "ACTIVE", members: { create: members.map((userId) => ({ orgId: org2, userId })) },
        },
      });
    c1 = (await mkCase("L-1", [e1.id, e2.id])).id;
    c2 = (await mkCase("L-2", [e2.id])).id;
    const mkTask = (title: string, status: TaskStatus, o: { assigneeId?: string | null; dueDate?: string; priority?: string; caseId?: string }) =>
      db.task.create({
        data: {
          orgId: org2, caseId: o.caseId ?? c1, title, priority: o.priority ?? "NORMAL", status,
          assigneeId: o.assigneeId ?? null, createdById: m.id, dueDate: o.dueDate ?? null,
        },
      });
    await mkTask("OPEN של המנהלת", "OPEN", { assigneeId: m.id, dueDate: addDays(today, -2) });
    await mkTask("OPEN בלי מוקצה", "OPEN", {});
    await mkTask("מוקצה לעובד 1 באיחור", "ASSIGNED", { assigneeId: e1.id, dueDate: addDays(today, -1), priority: "HIGH" });
    await mkTask("מוקצה לעובד 1 להיום", "ASSIGNED", { assigneeId: e1.id, dueDate: today });
    await mkTask("הוחזרה לעובד 1", "CHANGES_REQUESTED", { assigneeId: e1.id, dueDate: addDays(today, 3) });
    await mkTask("הוחזרה לעובד 2", "CHANGES_REQUESTED", { assigneeId: e2.id, caseId: c2, dueDate: addDays(today, 30) });
    await mkTask("ממתינה לבדיקה", "IN_REVIEW", { assigneeId: e2.id, caseId: c2, dueDate: addDays(today, -5) });
    await mkTask("הושלמה", "COMPLETED", { assigneeId: e1.id });
  });

  it("הספירות במסך \"לפי אדם\" תואמות לרשימה המסוננת של כל אדם", async () => {
    const load = await getTeamWorkload(m);
    expect(load.map((p) => p.user.name)).toEqual(["מנהלת", "עובד-1", "עובד-2"]); // מנהלת ראשונה, בלי המזכירה
    for (const p of load) {
      const list = await listTasks(m, { tab: "open", holder: p.user.id });
      expect(list.length, p.user.name).toBe(p.total);
      expect(list.map((t) => t.id).sort()).toEqual(p.tasks.map((t) => t.id).sort());
      const overdue = await listTasks(m, { tab: "open", holder: p.user.id, due: "overdue" });
      expect(overdue.length, p.user.name).toBe(p.overdue);
      const returned = await listTasks(m, { holder: p.user.id, status: "CHANGES_REQUESTED" });
      expect(returned.length, p.user.name).toBe(p.returned);
    }
    const by = Object.fromEntries(load.map((p) => [p.user.name, p]));
    // מנהלת: OPEN שלה, OPEN בלי מוקצה (היא יצרה), ממתינה לבדיקה
    expect([by["מנהלת"]!.total, by["מנהלת"]!.overdue, by["מנהלת"]!.returned]).toEqual([3, 2, 0]);
    expect([by["עובד-1"]!.total, by["עובד-1"]!.overdue, by["עובד-1"]!.returned]).toEqual([3, 1, 1]);
    expect([by["עובד-2"]!.total, by["עובד-2"]!.overdue, by["עובד-2"]!.returned]).toEqual([1, 0, 1]);
    // כל משימה פתוחה מופיעה אצל אדם אחד בדיוק
    expect(load.reduce((n, p) => n + p.total, 0)).toBe((await listTasks(m, { tab: "open" })).length);
  });

  it("המשימות בכל עמודה ממוינות לפי מועד יעד, בלי מועד בסוף", async () => {
    const load = await getTeamWorkload(m);
    const dates = load.find((p) => p.user.name === "עובד-1")!.tasks.map((t) => t.dueDate ?? "9999");
    expect(dates).toEqual([...dates].sort());
  });

  it("סינון לפי אדם: \"אני\", אדם מסוים, מזהה לא מוכר", async () => {
    expect((await listTasks(e1, { holder: "me", tab: "open" })).length).toBe(3);
    expect((await listTasks(m, { holder: "me", tab: "open" })).length).toBe(3);
    expect(await listTasks(m, { holder: "no-such-user" })).toEqual([]);
  });

  it("עובד שמסנן לפי עובד אחר לא מקבל משימות שאינן שלו", async () => {
    expect(await listTasks(e1, { holder: e2.id })).toEqual([]);
    expect(await listTasks(e1, { holder: m.id })).toEqual([]);
    // בלי סינון הוא ממשיך לראות את משימות התיקים שלו, ולא של תיק שאינו שלו
    const visible = await listTasks(e1, {});
    expect(visible.every((t) => t.case.id === c1)).toBe(true);
  });

  it("סינון לפי מועד יעד, עדיפות, סטטוס ותיק", async () => {
    const titles = async (f: Parameters<typeof listTasks>[1]) => (await listTasks(m, f)).map((t) => t.title).sort();
    expect(await titles({ due: "today" })).toEqual(["מוקצה לעובד 1 להיום"]);
    expect(await titles({ due: "overdue" })).toEqual(["OPEN של המנהלת", "ממתינה לבדיקה", "מוקצה לעובד 1 באיחור"].sort());
    const inWeek = await titles({ due: "week" });
    const endOfWeek = addDays(today, 6 - weekdayOf(today));
    const expectedWeek = (await db.task.findMany({ where: { orgId: org2, dueDate: { gte: today, lte: endOfWeek } } })).map((t) => t.title).sort();
    expect(inWeek).toEqual(expectedWeek);
    expect(await titles({ due: "range", from: addDays(today, 1), to: addDays(today, 10) })).toEqual(["הוחזרה לעובד 1"]);
    expect(await titles({ due: "range" })).toHaveLength(8); // טווח ריק לא מסנן
    expect(await titles({ priority: "HIGH" })).toEqual(["מוקצה לעובד 1 באיחור"]);
    expect(await titles({ status: "IN_REVIEW" })).toEqual(["ממתינה לבדיקה"]);
    expect((await listTasks(m, { caseId: c2 })).length).toBe(2);
    expect(await titles({ overdue: true })).toEqual(await titles({ due: "overdue" })); // תאימות לקישורי לוח הבקרה
  });

  it("המזכירה רואה את כל המשימות, וגם מסננת, בלי יכולת פעולה", async () => {
    expect((await listTasks(sec, {})).length).toBe(8);
    expect((await listTasks(sec, { holder: e1.id, tab: "open" })).length).toBe(3);
  });

  it("parseTaskFilters מנקה ערכים לא מוכרים מהכתובת", () => {
    const f = parseTaskFilters({ status: "BAD", priority: "HIGH", due: "bad", from: "2026-13", to: "2026-05-01", holder: "x", overdue: "1" });
    expect(f).toMatchObject({ status: undefined, priority: "HIGH", due: "overdue", from: undefined, to: "2026-05-01", holder: "x" });
    expect(parseTaskFilters({ status: ["IN_REVIEW", "x"] }).status).toBe("IN_REVIEW");
  });
});
