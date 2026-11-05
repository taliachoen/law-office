import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session-user";
import { NotFoundError, ValidationError } from "@/server/errors";
import { authorize, caseScope, clientScope, seesWholeOffice } from "@/server/policy";
import { assertValidOption } from "@/server/services/lookups";
import type { ClientInput, ContactInput } from "@/shared/schemas";

// שירות הלקוחות. כל פעולה בודקת הרשאה, וכל שינוי כותב AuditEvent באותה טרנזקציה.

export async function listClients(user: SessionUser, filters: { q?: string; type?: string; contactStatus?: string } = {}) {
  const q = filters.q?.trim();
  const where: Prisma.ClientWhereInput = {
    ...clientScope(user),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.contactStatus ? { contactStatus: filters.contactStatus } : {}),
    ...(q ? { OR: [{ fullName: { contains: q } }, { idNumber: { contains: q } }, { phone: { contains: q } }] } : {}),
  };
  return db.client.findMany({
    where,
    orderBy: { fullName: "asc" },
    // מספר התיקים סופר רק תיקים שהמשתמש רשאי לראות
    include: { _count: { select: { cases: { where: caseScope(user) } } } },
  });
}

export async function getClientDetail(user: SessionUser, id: string) {
  const client = await db.client.findFirst({
    where: { id, orgId: user.orgId, deletedAt: null },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
  });
  if (!client) throw new NotFoundError("הלקוח לא נמצא");

  const cases = await db.case.findMany({
    where: { clientId: id, orgId: user.orgId, deletedAt: null },
    include: { members: { select: { userId: true } }, responsibleUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  // עובד רשאי לראות לקוח אם הוא חבר לפחות באחד מתיקיו
  authorize(user, "client:read", {
    orgId: client.orgId,
    memberUserIds: cases.flatMap((c) => c.members.map((m) => m.userId)),
  });

  const visibleCases = seesWholeOffice(user) ? cases : cases.filter((c) => c.members.some((m) => m.userId === user.id));
  return { client, cases: visibleCases };
}

export async function createClient(user: SessionUser, input: ClientInput): Promise<{ id: string }> {
  authorize(user, "client:write", { orgId: user.orgId });
  return db.$transaction(async (tx) => {
    const contactStatus = input.contactStatus ?? "ACTIVE";
    await assertValidOption(tx, user.orgId, "CONTACT_STATUS", contactStatus);
    const created = await tx.client.create({
      data: {
        orgId: user.orgId,
        contactStatus,
        type: input.type,
        fullName: input.fullName,
        idNumber: input.idNumber ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Client", entityId: created.id,
      action: "CREATE", summary: `נוצר לקוח: ${created.fullName}`,
    });
    return { id: created.id };
  });
}

export async function updateClient(user: SessionUser, id: string, input: ClientInput): Promise<void> {
  authorize(user, "client:write", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({ where: { id, orgId: user.orgId, deletedAt: null } });
    if (!existing) throw new NotFoundError("הלקוח לא נמצא");
    // ערך שכובה ברשימה לא חוסם עריכת שדות אחרים: בודקים רק ערך ששונה
    const contactStatus = input.contactStatus ?? existing.contactStatus;
    if (contactStatus !== existing.contactStatus) await assertValidOption(tx, user.orgId, "CONTACT_STATUS", contactStatus);
    await tx.client.update({
      where: { id },
      data: {
        contactStatus,
        type: input.type,
        fullName: input.fullName,
        // ערך ריק מנקה את השדה (null), ולא משאיר את הישן
        idNumber: input.idNumber ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Client", entityId: id,
      action: "UPDATE", summary: `עודכנו פרטי הלקוח: ${input.fullName}`,
    });
  });
}

/** מחיקה רכה (סל מחזור). אסורה ללקוח שיש לו תיקים שאינם סגורים. */
export async function deleteClient(user: SessionUser, id: string): Promise<void> {
  authorize(user, "client:write-delete", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({ where: { id, orgId: user.orgId, deletedAt: null } });
    if (!existing) throw new NotFoundError("הלקוח לא נמצא");
    const openCases = await tx.case.count({
      where: { clientId: id, orgId: user.orgId, deletedAt: null, status: { not: "CLOSED" } },
    });
    if (openCases > 0) {
      throw new ValidationError("לא ניתן למחוק לקוח שיש לו תיקים פעילים. יש לסגור את התיקים תחילה");
    }
    await tx.client.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Client", entityId: id,
      action: "DELETE", summary: `הלקוח הועבר לסל המחזור: ${existing.fullName}`,
    });
  });
}

export async function addContact(user: SessionUser, input: ContactInput): Promise<void> {
  authorize(user, "client:write", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const client = await tx.client.findFirst({ where: { id: input.clientId, orgId: user.orgId, deletedAt: null } });
    if (!client) throw new NotFoundError("הלקוח לא נמצא");
    const contact = await tx.contact.create({
      data: {
        orgId: user.orgId, clientId: client.id, name: input.name, relation: input.relation,
        phone: input.phone ?? null, email: input.email ?? null,
      },
    });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Contact", entityId: contact.id,
      action: "CREATE", summary: `נוסף איש קשר ללקוח ${client.fullName}: ${input.name}`,
    });
  });
}

/** איש קשר הוא נתון משני ללקוח, ולכן נמחק סופית (עם רישום ב-AuditEvent). */
export async function removeContact(user: SessionUser, contactId: string): Promise<void> {
  authorize(user, "client:write", { orgId: user.orgId });
  await db.$transaction(async (tx) => {
    const contact = await tx.contact.findFirst({
      where: { id: contactId, orgId: user.orgId, client: { deletedAt: null } },
      include: { client: { select: { fullName: true } } },
    });
    if (!contact) throw new NotFoundError("איש הקשר לא נמצא");
    await tx.contact.delete({ where: { id: contactId } });
    await writeAudit(tx, {
      orgId: user.orgId, actorId: user.id, entityType: "Contact", entityId: contactId,
      action: "DELETE", summary: `הוסר איש קשר מהלקוח ${contact.client.fullName}: ${contact.name}`,
    });
  });
}
