import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { authorize, caseScope, type Action } from "@/server/policy";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/shared/constants";
import { todayIso } from "@/shared/dates";
import type { TaskCommandInput, TaskInput, TaskUpdateInput } from "@/shared/schemas";
import { TASK_COMMAND_LABELS, TASK_RULES, canTransition, targetStatus, type TaskCommand } from "@/shared/task-flow";

// שירות המשימות. מכונת המצבים עצמה (מי, מאיזה מצב, לאיזה מצב) מוגדרת ב-shared/task-flow;
// כאן נאכפים: הרשאה, גרסה (נעילה אופטימית), חובת טקסט, וכתיבת TaskEvent + AuditEvent באותה טרנזקציה.

type Tx = Prisma.TransactionClient;

export const TASK_TABS = ["open", "mine", "review", "done"] as const;
export type TaskTab = (typeof TASK_TABS)[number];
export type TaskFilters = { tab?: TaskTab; overdue?: boolean; status?: string; caseId?: string };

const STALE_MESSAGE = "המשימה עודכנה בחלון אחר. רעננו את הדף.";

function asStatus(value: string): TaskStatus {
  if (value in TASK_STATUS_LABELS) return value as TaskStatus;
  throw new Error(`סטטוס משימה לא תקין במסד: ${value}`);
}

// ---- קריאה ----

export async function listTasks(user: SessionUser, filters: TaskFilters = {}) {
  const today = todayIso();
  const notDone: Prisma.TaskWhereInput = { status: { not: "COMPLETED" } };
  const where: Prisma.TaskWhereInput = {
    orgId: user.orgId,
    deletedAt: null,
    case: caseScope(user), // עובד רואה משימות של התיקים שלו בלבד
    ...(filters.caseId ? { caseId: filters.caseId } : {}),
    ...(filters.tab === "open" ? notDone : {}),
    ...(filters.tab === "mine" ? { ...notDone, assigneeId: user.id } : {}),
    ...(filters.tab === "review" ? { status: "IN_REVIEW" } : {}),
    ...(filters.tab === "done" ? { status: "COMPLETED" } : {}),
    ...(filters.overdue ? { ...notDone, dueDate: { lt: today } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const rows = await db.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, title: true, internalNumber: true } },
      assignee: { select: { name: true } },
    },
  });
  // לפי מועד יעד עולה, משימות בלי מועד בסוף (המיון נעשה כאן כי תמיכה ב-nulls last שונה בין מסדים)
  return rows.sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
}

export async function getTaskDetail(user: SessionUser, id: string) {
  const task = await db.task.findFirst({
    where: { id, orgId: user.orgId, deletedAt: null },
    include: {
      case: { select: { id: true, title: true, internalNumber: true, status: true, members: { include: { user: { select: { id: true, name: true } } } } } },
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!task) throw new NotFoundError("המשימה לא נמצאה");
  authorize(user, "task:read", { orgId: task.orgId, memberUserIds: task.case.members.map((m) => m.userId) });
  return task;
}

/** תיקים ועובדים לטופס "משימה חדשה" (מנהלת בלבד). תיק סגור לא מוצע. */
export async function getTaskFormOptions(user: SessionUser) {
  authorize(user, "task:create", { orgId: user.orgId });
  const cases = await db.case.findMany({
    where: { orgId: user.orgId, deletedAt: null, status: { not: "CLOSED" } },
    orderBy: { internalNumber: "desc" },
    select: {
      id: true, title: true, internalNumber: true,
      members: { select: { user: { select: { id: true, name: true, role: true, active: true } } } },
    },
  });
  return cases.map((c) => ({
    id: c.id,
    label: `${c.internalNumber} · ${c.title}`,
    employees: c.members
      .map((m) => m.user)
      .filter((u) => u.role === "EMPLOYEE" && u.active)
      .map((u) => ({ value: u.id, label: u.name })),
  }));
}

// ---- יצירה ----

async function assertAssignable(tx: Tx, orgId: string, caseId: string, assigneeId: string) {
  const member = await tx.caseMember.findFirst({
    where: { caseId, userId: assigneeId, user: { orgId, active: true, role: "EMPLOYEE" } },
    select: { id: true },
  });
  if (!member) throw new ValidationError("ניתן להעביר משימה רק לעובד פעיל שמשויך לתיק");
}

export async function createTask(user: SessionUser, input: TaskInput): Promise<{ id: string }> {
  authorize(user, "task:create", { orgId: user.orgId });
  return db.$transaction(async (tx) => {
    const theCase = await tx.case.findFirst({ where: { id: input.caseId, orgId: user.orgId, deletedAt: null } });
    if (!theCase) throw new ValidationError("התיק שנבחר לא נמצא");
    if (theCase.status === "CLOSED") throw new ValidationError("לא ניתן ליצור משימה בתיק סגור");
    if (input.assigneeId) await assertAssignable(tx, user.orgId, theCase.id, input.assigneeId);

    const created = await tx.task.create({
      data: {
        orgId: user.orgId,
        caseId: theCase.id,
        title: input.title,
        instructions: input.instructions ?? null,
        priority: input.priority,
        status: input.assigneeId ? "ASSIGNED" : "OPEN",
        assigneeId: input.assigneeId ?? null,
        createdById: user.id,
        dueDate: input.dueDate ?? null,
      },
      include: { assignee: { select: { name: true } } },
    });
    await tx.taskEvent.create({ data: { orgId: user.orgId, taskId: created.id, actorId: user.id, type: "CREATED" } });
    if (created.assignee) {
      await tx.taskEvent.create({
        data: { orgId: user.orgId, taskId: created.id, actorId: user.id, type: "ASSIGNED", note: `הועברה אל ${created.assignee.name}` },
      });
    }
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Task", entityId: created.id, caseId: theCase.id,
      action: "CREATE", summary: `נוצרה משימה: ${created.title}`,
    });
    return { id: created.id };
  });
}

// ---- עריכת פרטים ----

const EDIT_LABELS = { title: "כותרת", instructions: "הוראות", priority: "עדיפות", dueDate: "מועד יעד" } as const;

/**
 * עריכת כותרת, הוראות, עדיפות ומועד יעד (מנהלת בלבד). לא נוגעת בסטטוס ובעובד: אלה עוברים
 * רק דרך מכונת המצבים. אם לא השתנה דבר, לא נכתב כלום (גם לא גרסה או אירוע).
 */
export async function updateTask(user: SessionUser, input: TaskUpdateInput): Promise<void> {
  authorize(user, "task:edit", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: input.taskId, orgId: user.orgId, deletedAt: null } });
    if (!task) throw new NotFoundError("המשימה לא נמצאה");
    if (input.version !== task.version) throw new ConflictError(STALE_MESSAGE);

    // ערך ריק מנקה את השדה (null)
    const next = {
      title: input.title,
      instructions: input.instructions ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
    };
    const changed = (Object.keys(EDIT_LABELS) as (keyof typeof EDIT_LABELS)[])
      .filter((k) => (task[k] ?? null) !== next[k])
      .map((k) => EDIT_LABELS[k]);
    if (changed.length === 0) return;

    const result = await tx.task.updateMany({
      where: { id: task.id, orgId: user.orgId, version: task.version, deletedAt: null },
      data: { ...next, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictError(STALE_MESSAGE);

    const list = changed.join(", ");
    await tx.taskEvent.create({
      data: { orgId: user.orgId, taskId: task.id, actorId: user.id, type: "UPDATED", note: `עודכנו: ${list}` },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Task", entityId: task.id, caseId: task.caseId,
      action: "UPDATE", summary: `עודכנו פרטי המשימה (${list}): ${next.title}`,
    });
  });
}

// ---- מעברים ----

const COMMAND_ACTION: Record<TaskCommand, Action> = {
  ASSIGN: "task:assign",
  SUBMIT: "task:submit",
  REQUEST_CHANGES: "task:review",
  COMPLETE: "task:review",
  REOPEN: "task:review",
  DELETE: "task:delete",
};

/** סיכום קצר בעברית ל-AuditEvent של כל פעולה. */
function auditSummary(command: TaskCommand, title: string, extra?: string): string {
  const base: Record<TaskCommand, string> = {
    ASSIGN: "המשימה הועברה לעובד",
    SUBMIT: "המשימה הוגשה לבדיקה",
    REQUEST_CHANGES: "המשימה הוחזרה לתיקון",
    COMPLETE: "המשימה הושלמה",
    REOPEN: "המשימה נפתחה מחדש",
    DELETE: "המשימה הועברה לסל המחזור",
  };
  return `${base[command]}: ${title}${extra ? ` (${extra})` : ""}`;
}

/**
 * מבצע פקודה במכונת המצבים. סדר הבדיקות חשוב:
 * 1) הרשאה, 2) גרסה (משימה שהשתנתה בחלון אחר), 3) חוקיות המעבר מהמצב הנוכחי, 4) חובת טקסט.
 * הכול, כולל TaskEvent ו-AuditEvent, בטרנזקציה אחת; כישלון בכל שלב מבטל הכול.
 */
export async function runTaskCommand(user: SessionUser, input: TaskCommandInput): Promise<void> {
  const { command } = input;
  const rule = TASK_RULES[command];

  await db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: input.taskId, orgId: user.orgId, deletedAt: null },
      include: { case: { select: { id: true, members: { select: { userId: true } } } }, assignee: { select: { name: true } } },
    });
    if (!task) throw new NotFoundError("המשימה לא נמצאה");

    // 1) הרשאה. עובד שאינו חבר בתיק לא יכול לפעול על המשימה גם אם ננחש את המזהה.
    authorize(user, COMMAND_ACTION[command], {
      orgId: task.orgId,
      memberUserIds: task.case.members.map((m) => m.userId),
      assigneeId: task.assigneeId,
    });
    // 2) גרסה
    if (input.version !== task.version) throw new ConflictError(STALE_MESSAGE);
    // 3) מעבר חוקי
    const status = asStatus(task.status);
    if (!canTransition(command, status)) {
      throw new ValidationError(`אי אפשר לבצע "${TASK_COMMAND_LABELS[command]}" על משימה במצב "${TASK_STATUS_LABELS[status]}"`);
    }
    // 4) חובת טקסט
    const text = input.text?.trim() || undefined;
    if (rule.textRequired && !text) throw new ValidationError(rule.textRequired);

    // העברה לעובד (או פתיחה מחדש עם עובד) מחייבת עובד פעיל שמשויך לתיק
    const needsAssignee = command === "ASSIGN";
    if (needsAssignee && !input.assigneeId) throw new ValidationError("יש לבחור עובד");
    if (input.assigneeId && (command === "ASSIGN" || command === "REOPEN")) {
      await assertAssignable(tx, user.orgId, task.caseId, input.assigneeId);
    }

    const next = targetStatus(command, status, { withAssignee: !!input.assigneeId });
    const data = buildUpdate(command, task, next, text, input.assigneeId, user.id);

    // הגנה נוספת מפני מרוץ: העדכון חל רק אם הגרסה והמצב עדיין כפי שקראנו
    const result = await tx.task.updateMany({
      where: { id: task.id, orgId: user.orgId, version: task.version, status: task.status, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictError(STALE_MESSAGE);

    let eventNote = text;
    let auditExtra: string | undefined;
    if (input.assigneeId && (command === "ASSIGN" || command === "REOPEN")) {
      const assignee = await tx.user.findUniqueOrThrow({ where: { id: input.assigneeId }, select: { name: true } });
      eventNote = [`הועברה אל ${assignee.name}`, text].filter(Boolean).join(" · ");
      auditExtra = assignee.name;
    }
    await tx.taskEvent.create({
      data: { orgId: user.orgId, taskId: task.id, actorId: user.id, type: rule.event, note: eventNote ?? null },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Task", entityId: task.id, caseId: task.caseId,
      action: command, summary: auditSummary(command, task.title, auditExtra),
    });
  });
}

function buildUpdate(
  command: TaskCommand,
  task: { status: string; assigneeId: string | null },
  next: TaskStatus,
  text: string | undefined,
  assigneeId: string | undefined,
  actorId: string,
): Prisma.TaskUncheckedUpdateManyInput {
  switch (command) {
    case "ASSIGN":
      return { status: next, assigneeId };
    case "SUBMIT":
    case "REQUEST_CHANGES":
      return { status: next };
    case "COMPLETE":
      return { status: next, completionSummary: text };
    case "REOPEN":
      // הסיכום הישן נשאר בציר הזמן (אירוע COMPLETED); בשדה הוא מתרוקן כי המשימה שוב פתוחה
      return { status: next, completionSummary: null, assigneeId: assigneeId ?? null };
    case "DELETE":
      return { statusBeforeTrash: task.status, deletedAt: new Date(), deletedById: actorId };
  }
}

// ---- סל מחזור (משימות) ----

export async function listDeletedTasks(user: SessionUser) {
  authorize(user, "trash:view", { orgId: user.orgId });
  const rows = await db.task.findMany({
    where: { orgId: user.orgId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { case: { select: { id: true, title: true, internalNumber: true } } },
  });
  const deleters = await db.user.findMany({
    where: { id: { in: [...new Set(rows.flatMap((r) => (r.deletedById ? [r.deletedById] : [])))] } },
    select: { id: true, name: true },
  });
  const names = new Map(deleters.map((u) => [u.id, u.name]));
  return rows.map((r) => ({ ...r, deletedByName: r.deletedById ? (names.get(r.deletedById) ?? "משתמש לא ידוע") : "משתמש לא ידוע" }));
}

/** שחזור מחזיר את המשימה למצב שנשמר ב-statusBeforeTrash. מסמכים מקושרים לא נמחקו, ולכן חוזרים איתה. */
export async function restoreTask(user: SessionUser, taskId: string): Promise<void> {
  authorize(user, "trash:restore", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, orgId: user.orgId, deletedAt: { not: null } },
      include: { case: { select: { deletedAt: true } } },
    });
    if (!task) throw new NotFoundError("המשימה לא נמצאה בסל המחזור");
    if (task.case.deletedAt) throw new ValidationError("התיק של המשימה נמצא בסל המחזור. יש לשחזר אותו קודם");

    const result = await tx.task.updateMany({
      where: { id: task.id, orgId: user.orgId, deletedAt: { not: null }, version: task.version },
      data: {
        status: task.statusBeforeTrash ?? task.status,
        statusBeforeTrash: null,
        deletedAt: null,
        deletedById: null,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) throw new ConflictError(STALE_MESSAGE);

    await tx.taskEvent.create({ data: { orgId: user.orgId, taskId: task.id, actorId: user.id, type: "RESTORED" } });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Task", entityId: task.id, caseId: task.caseId,
      action: "RESTORE", summary: `המשימה שוחזרה מסל המחזור: ${task.title}`,
    });
  });
}
