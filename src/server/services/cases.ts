import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { authorize, caseScope } from "@/server/policy";
import { assertValidOption } from "@/server/services/lookups";
import { todayIso } from "@/shared/dates";
import type { CaseInput, CaseUpdateInput } from "@/shared/schemas";

// שירות התיקים. כמו בשירות הלקוחות: הרשאה בכל פעולה, ו-AuditEvent באותה טרנזקציה.

type Tx = Prisma.TransactionClient;

export type CaseFilters = { q?: string; status?: string; caseType?: string; responsibleId?: string };

export async function listCases(user: SessionUser, filters: CaseFilters = {}) {
  const q = filters.q?.trim();
  const where: Prisma.CaseWhereInput = {
    ...caseScope(user),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.caseType ? { caseType: filters.caseType } : {}),
    ...(filters.responsibleId ? { responsibleUserId: filters.responsibleId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { internalNumber: { contains: q } },
            { courtCaseNumber: { contains: q } },
            { client: { fullName: { contains: q } } },
          ],
        }
      : {}),
  };
  return db.case.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: { client: { select: { id: true, fullName: true } }, responsibleUser: { select: { name: true } } },
  });
}

/** טוען תיק ובודק שהמשתמש רשאי לצפות בו. תיק שאינו קיים: NotFound; קיים אך לא שלו: Forbidden. */
async function loadCaseForRead(user: SessionUser, id: string) {
  const found = await db.case.findFirst({
    where: { id, orgId: user.orgId, deletedAt: null },
    include: {
      client: { select: { id: true, fullName: true, type: true } },
      responsibleUser: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!found) throw new NotFoundError("התיק לא נמצא");
  authorize(user, "case:read", { orgId: found.orgId, memberUserIds: found.members.map((m) => m.userId) });
  return found;
}

export async function getCaseDetail(user: SessionUser, id: string) {
  const theCase = await loadCaseForRead(user, id);
  const today = todayIso();
  const [openTasks, nextDeadline] = await Promise.all([
    db.task.findMany({
      where: { caseId: id, orgId: user.orgId, deletedAt: null, status: { not: "COMPLETED" } },
      orderBy: [{ dueDate: "asc" }],
      take: 10,
      include: { assignee: { select: { name: true } } },
    }),
    db.deadline.findFirst({
      where: { caseId: id, orgId: user.orgId, deletedAt: null, done: false, date: { gte: today } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
  ]);
  return { case: theCase, openTasks, nextDeadline };
}

export async function getCaseHistory(user: SessionUser, id: string) {
  await loadCaseForRead(user, id);
  const events = await db.auditEvent.findMany({
    where: { caseId: id, orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const actors = await db.user.findMany({
    where: { id: { in: [...new Set(events.map((e) => e.actorId))] } },
    select: { id: true, name: true },
  });
  const names = new Map(actors.map((a) => [a.id, a.name]));
  return events.map((e) => ({ ...e, actorName: names.get(e.actorId) ?? "משתמש לא ידוע" }));
}

/** מספר פנימי רץ לפי שנה: 2026-001, 2026-002... כולל תיקים שנמחקו, כדי לא להתנגש בהם. */
async function nextInternalNumber(tx: Tx, orgId: string): Promise<string> {
  const year = todayIso().slice(0, 4);
  const existing = await tx.case.findMany({
    where: { orgId, internalNumber: { startsWith: `${year}-` } },
    select: { internalNumber: true },
  });
  const max = Math.max(0, ...existing.map((c) => Number(c.internalNumber.slice(year.length + 1)) || 0));
  return `${year}-${String(max + 1).padStart(3, "0")}`;
}

async function assertActiveUser(tx: Tx, orgId: string, userId: string) {
  const found = await tx.user.findFirst({ where: { id: userId, orgId, active: true } });
  if (!found) throw new ValidationError("האחראי שנבחר אינו משתמש פעיל");
  return found;
}

/**
 * עובד שהוא האחראי על תיק חייב להיות גם חבר בו, אחרת ההרשאות היו מסתירות ממנו
 * את התיק שהוא אחראי עליו.
 */
async function ensureResponsibleIsMember(tx: Tx, orgId: string, caseId: string, responsible: { id: string; role: string }) {
  if (responsible.role !== "EMPLOYEE") return;
  const exists = await tx.caseMember.findUnique({ where: { caseId_userId: { caseId, userId: responsible.id } } });
  if (!exists) await tx.caseMember.create({ data: { orgId, caseId, userId: responsible.id } });
}

export async function createCase(user: SessionUser, input: CaseInput): Promise<{ id: string }> {
  authorize(user, "case:write", { orgId: user.orgId });
  return db.$transaction(async (tx) => {
    const client = await tx.client.findFirst({ where: { id: input.clientId, orgId: user.orgId, deletedAt: null } });
    if (!client) throw new ValidationError("הלקוח שנבחר לא נמצא");
    await assertValidOption(tx, user.orgId, "CASE_TYPE", input.caseType);
    if (input.court) await assertValidOption(tx, user.orgId, "COURT", input.court);
    const responsible = await assertActiveUser(tx, user.orgId, input.responsibleUserId);

    const created = await tx.case.create({
      data: {
        orgId: user.orgId,
        clientId: client.id,
        title: input.title,
        internalNumber: await nextInternalNumber(tx, user.orgId),
        courtCaseNumber: input.courtCaseNumber ?? null,
        caseType: input.caseType,
        court: input.court ?? null,
        opposingParty: input.opposingParty ?? null,
        opposingCounsel: input.opposingCounsel ?? null,
        responsibleUserId: responsible.id,
        status: input.status,
        summary: input.summary ?? null,
        nextAction: input.nextAction ?? null,
      },
    });
    await ensureResponsibleIsMember(tx, user.orgId, created.id, responsible);
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Case", entityId: created.id, caseId: created.id,
      action: "CREATE", summary: `נפתח תיק ${created.internalNumber}: ${created.title}`,
    });
    return { id: created.id };
  });
}

const FIELD_LABELS = {
  title: "כותרת",
  courtCaseNumber: "מספר הליך",
  caseType: "סוג תיק",
  court: "ערכאה",
  opposingParty: "צד שכנגד",
  opposingCounsel: "עו״ד הצד שכנגד",
  responsibleUserId: "אחראי",
  status: "סטטוס",
  summary: "סיכום מצב",
  nextAction: "פעולה הבאה",
} as const;

export async function updateCase(user: SessionUser, id: string, input: CaseUpdateInput): Promise<void> {
  authorize(user, "case:write", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const existing = await tx.case.findFirst({ where: { id, orgId: user.orgId, deletedAt: null } });
    if (!existing) throw new NotFoundError("התיק לא נמצא");

    // ערכים שכבר לא פעילים ברשימה (כובו) לא חוסמים עריכת שדות אחרים: בודקים רק ערך ששונה
    if (input.caseType !== existing.caseType) await assertValidOption(tx, user.orgId, "CASE_TYPE", input.caseType);
    if (input.court && input.court !== existing.court) await assertValidOption(tx, user.orgId, "COURT", input.court);
    const responsible = await assertActiveUser(tx, user.orgId, input.responsibleUserId);

    const next = {
      title: input.title,
      courtCaseNumber: input.courtCaseNumber ?? null,
      caseType: input.caseType,
      court: input.court ?? null,
      opposingParty: input.opposingParty ?? null,
      opposingCounsel: input.opposingCounsel ?? null,
      responsibleUserId: input.responsibleUserId,
      status: input.status,
      summary: input.summary ?? null,
      nextAction: input.nextAction ?? null,
    };

    // נעילה אופטימית: העדכון חל רק אם הגרסה שהטופס נפתח עליה עדיין הנוכחית
    const result = await tx.case.updateMany({
      where: { id, orgId: user.orgId, deletedAt: null, version: input.version },
      data: { ...next, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictError("התיק עודכן בחלון אחר. רעננו את הדף.");

    await ensureResponsibleIsMember(tx, user.orgId, id, responsible);

    const changed = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
      .filter((k) => (existing[k] ?? null) !== next[k])
      .map((k) => FIELD_LABELS[k]);
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Case", entityId: id, caseId: id,
      action: "UPDATE",
      summary: changed.length ? `עודכן התיק (${changed.join(", ")})` : "התיק נשמר ללא שינוי",
    });
  });
}

/** קובע את רשימת העובדים המשויכים לתיק. האחראי העובד תמיד נשאר חבר. */
export async function setCaseMembers(user: SessionUser, caseId: string, userIds: string[]): Promise<void> {
  authorize(user, "case:assign-members", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const theCase = await tx.case.findFirst({
      where: { id: caseId, orgId: user.orgId, deletedAt: null },
      include: { members: { include: { user: { select: { name: true } } } }, responsibleUser: { select: { id: true, role: true } } },
    });
    if (!theCase) throw new NotFoundError("התיק לא נמצא");

    const wanted = new Set(userIds);
    if (theCase.responsibleUser.role === "EMPLOYEE") wanted.add(theCase.responsibleUser.id);

    const employees = await tx.user.findMany({
      where: { id: { in: [...wanted] }, orgId: user.orgId, active: true, role: "EMPLOYEE" },
      select: { id: true, name: true },
    });
    if (employees.length !== wanted.size) throw new ValidationError("ניתן לשייך לתיק רק עובדים פעילים בארגון");

    const current = new Map(theCase.members.map((m) => [m.userId, m.user.name]));
    const toAdd = employees.filter((e) => !current.has(e.id));
    const toRemove = [...current.entries()].filter(([uid]) => !wanted.has(uid));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    if (toRemove.length) {
      await tx.caseMember.deleteMany({ where: { caseId, userId: { in: toRemove.map(([uid]) => uid) } } });
    }
    if (toAdd.length) {
      await tx.caseMember.createMany({ data: toAdd.map((e) => ({ orgId: user.orgId, caseId, userId: e.id })) });
    }
    const parts = [
      toAdd.length ? `שויכו: ${toAdd.map((e) => e.name).join(", ")}` : "",
      toRemove.length ? `הוסרו: ${toRemove.map(([, name]) => name).join(", ")}` : "",
    ].filter(Boolean);
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Case", entityId: caseId, caseId,
      action: "MEMBERS", summary: `עודכן שיוך העובדים לתיק. ${parts.join(". ")}`,
    });
  });
}
