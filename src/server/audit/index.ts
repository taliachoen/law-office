import type { Prisma } from "@/generated/prisma/client";

export type AuditInput = {
  orgId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  /** אם האירוע שייך לתיק, כדי שיופיע בלשונית "היסטוריה" של התיק */
  caseId?: string | null;
  action: string;
  /** עברית קצרה. בלי תוכן מסמכים ובלי מידע רגיש. */
  summary: string;
};

/**
 * כותב AuditEvent. מקבל את ה-tx של הטרנזקציה (ולא את db) בכוונה:
 * כך אי אפשר לכתוב אירוע ביקורת מחוץ לטרנזקציה של השינוי עצמו,
 * ואם השינוי נכשל גם האירוע מתבטל.
 */
export async function writeAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  return tx.auditEvent.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      caseId: input.caseId ?? null,
      action: input.action,
      summary: input.summary,
    },
  });
}
