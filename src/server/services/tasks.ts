import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { authorize, caseScope, type Action } from "@/server/policy";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/shared/constants";
import { addDays, todayIso, weekdayOf } from "@/shared/dates";
import type { TaskFilterParams } from "@/shared/task-filters";
import type { TaskCommandInput, TaskInput, TaskUpdateInput } from "@/shared/schemas";
import { TASK_COMMAND_LABELS, TASK_RULES, canTransition, targetStatus, taskHolderId, type TaskCommand } from "@/shared/task-flow";

// שירות המשימות. מכונת המצבים עצמה (מי, מאיזה מצב, לאיזה מצב) מוגדרת ב-shared/task-flow;
// כאן נאכפים: הרשאה, גרסה (נעילה אופטימית), חובת טקסט, וכתיבת TaskEvent + AuditEvent באותה טרנזקציה.

type Tx = Prisma.TransactionClient;

export const TASK_TABS = ["open", "mine", "review", "done"] as const;
export type TaskTab = (typeof TASK_TABS)[number];
export type TaskFilters = TaskFilterParams & { tab?: TaskTab; overdue?: boolean };

const STALE_MESSAGE = "המשימה עודכנה בחלון אחר. רעננו את הדף.";

function asStatus(value: string): TaskStatus {
  if (value in TASK_STATUS_LABELS) return value as TaskStatus;
  throw new Error(`סטטוס משימה לא תקין במסד: ${value}`);
}

// ---- קריאה ----

/** המנהלת של הארגון. בדגם יש אחת, והיא מחזיקה בכל משימה שממתינה לבדיקה. */
async function findPrimaryManager(orgId: string) {
  return db.user.findFirst({ where: { orgId, role: "MANAGER", active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
}

/** שם מי שמחזיק במשימה עכשיו ("אצל מי עכשיו"), לתצוגה. */
function holderNameOf(
  t: { status: string; assigneeId: string | null; createdById: string; assignee: { name: string } | null; createdBy: { name: string } },
  manager: { id: string; name: string } | null,
): string | null {
  const holder = taskHolderId({ status: asStatus(t.status), assigneeId: t.assigneeId, createdById: t.createdById }, manager?.id ?? null);
  if (!holder) return null;
  if (holder === t.assigneeId) return t.assignee?.name ?? null;
  if (holder === t.createdById) return t.createdBy.name;
  return holder === manager?.id ? manager.name : null;
}

/** תנאי "אצל מי עכשיו" ב-Prisma. חייב להתאים ל-taskHolderId (נבדק בבדיקות). */
function holderWhere(target: { id: string; role: string }): Prisma.TaskWhereInput {
  return {
    OR: [
      { status: { in: ["ASSIGNED", "CHANGES_REQUESTED"] }, assigneeId: target.id },
      { status: "OPEN", OR: [{ assigneeId: target.id }, { assigneeId: null, createdById: target.id }] },
      // בדגם יש מנהלת אחת, והיא מחזיקה בכל מה שממתין לבדיקה
      ...(target.role === "MANAGER" ? [{ status: "IN_REVIEW" }] : []),
    ],
  };
}

/** "השבוע" נגמר בשבת (שבוע עבודה ישראלי: ראשון עד שבת). */
function endOfWeek(today: string): string {
  return addDays(today, 6 - weekdayOf(today));
}

function dueWhere(f: TaskFilterParams, today: string): Prisma.TaskWhereInput | null {
  switch (f.due) {
    case "overdue": return { status: { not: "COMPLETED" }, dueDate: { lt: today } };
    case "today": return { dueDate: today };
    case "week": return { dueDate: { gte: today, lte: endOfWeek(today) } };
    case "range":
      if (!f.from && !f.to) return null;
      return { dueDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } };
    default: return null;
  }
}

export async function listTasks(user: SessionUser, filters: TaskFilters = {}) {
  const today = todayIso();
  const notDone: Prisma.TaskWhereInput = { status: { not: "COMPLETED" } };

  // סינון לפי אדם. עובד לא יכול להציץ בעומס של עמית: סינון לפי אדם אחר מחזיר רשימה ריקה
  let holder: Prisma.TaskWhereInput | null = null;
  const holderId = filters.holder === "me" ? user.id : filters.holder;
  if (holderId) {
    if (user.role === "EMPLOYEE" && holderId !== user.id) return [];
    const target = await db.user.findFirst({ where: { id: holderId, orgId: user.orgId }, select: { id: true, role: true } });
    if (!target) return [];
    holder = holderWhere(target);
  }

  const due = dueWhere(filters.overdue ? { ...filters, due: "overdue" } : filters, today);
  const and: Prisma.TaskWhereInput[] = [
    ...(filters.tab === "open" ? [notDone] : []),
    ...(filters.tab === "mine" ? [notDone, { assigneeId: user.id }] : []),
    ...(filters.tab === "review" ? [{ status: "IN_REVIEW" }] : []),
    ...(filters.tab === "done" ? [{ status: "COMPLETED" }] : []),
    ...(filters.status ? [{ status: filters.status }] : []),
    ...(filters.priority ? [{ priority: filters.priority }] : []),
    ...(holder ? [holder] : []),
    ...(due ? [due] : []),
  ];
  const rows = await db.task.findMany({
    where: {
      orgId: user.orgId,
      deletedAt: null,
      case: caseScope(user), // עובד רואה משימות של התיקים שלו בלבד
      ...(filters.caseId ? { caseId: filters.caseId } : {}),
      AND: and,
    },
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, title: true, internalNumber: true } },
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  const manager = await findPrimaryManager(user.orgId);
  // לפי מועד יעד עולה, משימות בלי מועד בסוף (המיון נעשה כאן כי תמיכה ב-nulls last שונה בין מסדים)
  return rows
    .map((r) => ({ ...r, holderName: holderNameOf(r, manager) }))
    .sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
}

/** מי שאפשר לסנן לפיו (כל הצוות), למנהלת. עובד יכול לסנן רק לפי עצמו, ולכן לא מקבל רשימה. */
export async function listTeamMembers(user: SessionUser) {
  authorize(user, "task:team-load", { orgId: user.orgId });
  const rows = await db.user.findMany({
    where: { orgId: user.orgId, active: true, role: { in: ["MANAGER", "EMPLOYEE"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  // המנהלת ראשונה, אחריה העובדים לפי שם
  return [...rows.filter((r) => r.role === "MANAGER"), ...rows.filter((r) => r.role !== "MANAGER")];
}

/**
 * עומס צוות (לשונית "לפי אדם", מנהלת בלבד): לכל אחד בצוות, כולל המנהלת, המשימות שאצלו עכשיו,
 * כמה מהן באיחור וכמה הוחזרו לתיקון. השיוך לאדם הוא "אצל מי עכשיו" (taskHolderId).
 */
export async function getTeamWorkload(user: SessionUser) {
  const people = await listTeamMembers(user);
  const managerId = (await findPrimaryManager(user.orgId))?.id ?? null;
  const today = todayIso();
  const tasks = await db.task.findMany({
    where: { orgId: user.orgId, deletedAt: null, status: { not: "COMPLETED" } },
    include: {
      case: { select: { id: true, title: true, internalNumber: true } },
      assignee: { select: { name: true } },
    },
  });
  const byHolder = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const holder = taskHolderId({ status: asStatus(t.status), assigneeId: t.assigneeId, createdById: t.createdById }, managerId);
    if (!holder) continue;
    byHolder.set(holder, [...(byHolder.get(holder) ?? []), t]);
  }
  return people.map((person) => {
    const mine = (byHolder.get(person.id) ?? []).sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
    return {
      user: person,
      total: mine.length,
      overdue: mine.filter((t) => t.dueDate !== null && t.dueDate < today).length,
      returned: mine.filter((t) => t.status === "CHANGES_REQUESTED").length,
      tasks: mine,
    };
  });
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
  const manager = await findPrimaryManager(user.orgId);
  return { ...task, holderName: holderNameOf(task, manager) };
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
        // בלי בחירת עובד המשימה נשארת אצל היוצרת (מנהלת), בסטטוס OPEN
        assigneeId: input.assigneeId ?? user.id,
        createdById: user.id,
        dueDate: input.dueDate ?? null,
      },
      include: { assignee: { select: { name: true } } },
    });
    await tx.taskEvent.create({ data: { orgId: user.orgId, taskId: created.id, actorId: user.id, type: "CREATED" } });
    if (created.assignee && input.assigneeId) {
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
