import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { authorize, can } from "@/server/policy";
import { CASE_NOTE_KIND_LABELS, CASE_NOTE_KINDS, type CaseNoteKind } from "@/shared/constants";
import { israelLocalToDate } from "@/shared/dates";
import type { NoteInput, NoteUpdateInput } from "@/shared/schemas";

// שירות התיעוד בתיק (סעיף 6.13 במפרט): שיחות, פגישות והערות.
// יצירה: כל מי שמורשה לתיק. עריכה: היוצר תוך 24 שעות, או מנהלת. מחיקה לסל: מנהלת.

const STALE_MESSAGE = "התיעוד עודכן בחלון אחר. רעננו את הדף.";
/** סבילות לשעון: תיעוד "מהעתיד" נדחה, אבל לא בגלל הפרש של דקות */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function asKind(value: string): CaseNoteKind {
  if ((CASE_NOTE_KINDS as readonly string[]).includes(value)) return value as CaseNoteKind;
  throw new Error(`סוג תיעוד לא תקין במסד: ${value}`);
}

async function loadCaseMembers(user: SessionUser, caseId: string) {
  const theCase = await db.case.findFirst({
    where: { id: caseId, orgId: user.orgId, deletedAt: null },
    select: { id: true, orgId: true, title: true, members: { select: { userId: true } } },
  });
  if (!theCase) throw new NotFoundError("התיק לא נמצא");
  return { ...theCase, memberUserIds: theCase.members.map((m) => m.userId) };
}

function resolveOccurredAt(local: string | undefined): Date {
  const now = new Date();
  if (!local) return now;
  const at = israelLocalToDate(local);
  if (Number.isNaN(at.getTime())) throw new ValidationError("תאריך ושעה לא תקינים");
  if (at.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new ValidationError("לא ניתן לתעד אירוע שעוד לא קרה");
  return at;
}

export async function listNotes(user: SessionUser, caseId: string, filters: { kind?: string } = {}) {
  const theCase = await loadCaseMembers(user, caseId);
  authorize(user, "note:read", { orgId: theCase.orgId, memberUserIds: theCase.memberUserIds });
  const kind = filters.kind && (CASE_NOTE_KINDS as readonly string[]).includes(filters.kind) ? filters.kind : undefined;
  const rows = await db.caseNote.findMany({
    where: { caseId, orgId: user.orgId, deletedAt: null, ...(kind ? { kind } : {}) },
    orderBy: { occurredAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  const now = new Date();
  return rows.map((n) => ({
    ...n,
    kind: asKind(n.kind),
    // הממשק מציג "עריכה" רק למי שהשרת היה מאשר לו; השרת בודק שוב בעת השמירה
    canEdit: can(user, "note:edit", { orgId: n.orgId, memberUserIds: theCase.memberUserIds, createdById: n.createdById, createdAt: n.createdAt }, now),
    canDelete: can(user, "note:delete", { orgId: n.orgId }),
  }));
}

/** התיעודים האחרונים לסקירת התיק (ברירת מחדל: שלושה). */
export async function latestNotes(user: SessionUser, caseId: string, take = 3) {
  const rows = await listNotes(user, caseId);
  return rows.slice(0, take);
}

export async function createNote(user: SessionUser, input: NoteInput): Promise<{ id: string }> {
  const theCase = await loadCaseMembers(user, input.caseId);
  authorize(user, "note:create", { orgId: theCase.orgId, memberUserIds: theCase.memberUserIds });
  const occurredAt = resolveOccurredAt(input.occurredAt);
  return db.$transaction(async (tx) => {
    const created = await tx.caseNote.create({
      data: {
        orgId: user.orgId, caseId: theCase.id, kind: input.kind, occurredAt,
        participants: input.participants ?? null, body: input.body, createdById: user.id,
      },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "CaseNote", entityId: created.id, caseId: theCase.id,
      action: "CREATE", summary: `נוסף תיעוד (${CASE_NOTE_KIND_LABELS[input.kind]}) בתיק: ${theCase.title}`,
    });
    return { id: created.id };
  });
}

export async function updateNote(user: SessionUser, input: NoteUpdateInput): Promise<void> {
  await db.$transaction(async (tx) => {
    const note = await tx.caseNote.findFirst({
      where: { id: input.noteId, orgId: user.orgId, deletedAt: null },
      include: { case: { select: { members: { select: { userId: true } } } } },
    });
    if (!note) throw new NotFoundError("התיעוד לא נמצא");
    authorize(user, "note:edit", {
      orgId: note.orgId,
      memberUserIds: note.case.members.map((m) => m.userId),
      createdById: note.createdById,
      createdAt: note.createdAt,
    });
    if (input.version !== note.version) throw new ConflictError(STALE_MESSAGE);
    const occurredAt = input.occurredAt ? resolveOccurredAt(input.occurredAt) : note.occurredAt;

    const result = await tx.caseNote.updateMany({
      where: { id: note.id, orgId: user.orgId, version: note.version, deletedAt: null },
      data: {
        kind: input.kind, occurredAt, participants: input.participants ?? null, body: input.body,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) throw new ConflictError(STALE_MESSAGE);
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "CaseNote", entityId: note.id, caseId: note.caseId,
      action: "UPDATE", summary: `עודכן תיעוד (${CASE_NOTE_KIND_LABELS[input.kind]})`,
    });
  });
}

/** מחיקה רכה (סל מחזור). מנהלת בלבד. */
export async function deleteNote(user: SessionUser, noteId: string): Promise<void> {
  authorize(user, "note:delete", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const note = await tx.caseNote.findFirst({ where: { id: noteId, orgId: user.orgId, deletedAt: null } });
    if (!note) throw new NotFoundError("התיעוד לא נמצא");
    await tx.caseNote.update({ where: { id: note.id }, data: { deletedAt: new Date(), deletedById: user.id } });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "CaseNote", entityId: note.id, caseId: note.caseId,
      action: "DELETE", summary: "תיעוד הועבר לסל המחזור",
    });
  });
}

// ---- סל מחזור ----

export async function listDeletedNotes(user: SessionUser) {
  authorize(user, "trash:view", { orgId: user.orgId });
  const rows = await db.caseNote.findMany({
    where: { orgId: user.orgId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { case: { select: { id: true, title: true } } },
  });
  const deleters = await db.user.findMany({
    where: { id: { in: [...new Set(rows.flatMap((r) => (r.deletedById ? [r.deletedById] : [])))] } },
    select: { id: true, name: true },
  });
  const names = new Map(deleters.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    ...r,
    kind: asKind(r.kind),
    deletedByName: r.deletedById ? (names.get(r.deletedById) ?? "משתמש לא ידוע") : "משתמש לא ידוע",
  }));
}

export async function restoreNote(user: SessionUser, noteId: string): Promise<void> {
  authorize(user, "trash:restore", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const note = await tx.caseNote.findFirst({
      where: { id: noteId, orgId: user.orgId, deletedAt: { not: null } },
      include: { case: { select: { deletedAt: true } } },
    });
    if (!note) throw new NotFoundError("התיעוד לא נמצא בסל המחזור");
    if (note.case.deletedAt) throw new ValidationError("התיק של התיעוד נמצא בסל המחזור. יש לשחזר אותו קודם");
    const result = await tx.caseNote.updateMany({
      where: { id: note.id, orgId: user.orgId, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictError(STALE_MESSAGE);
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "CaseNote", entityId: note.id, caseId: note.caseId,
      action: "RESTORE", summary: "תיעוד שוחזר מסל המחזור",
    });
  });
}
