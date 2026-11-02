import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { ValidationError } from "@/server/errors";
import type { LookupList } from "@/shared/constants";

// רשימות הניתנות להגדרה לפי ארגון. קריאה פתוחה לכל משתמש בארגון (הוא צריך אותן
// בטפסים ובתצוגה); ניהול הרשימות (settings:manage) ייבנה יחד עם מסך ההגדרות.

export type LookupOptionView = { code: string; label: string; active: boolean };

/** ערכים לבחירה בטפסים: רק פעילים, לפי הסדר. */
export async function getActiveOptions(user: SessionUser, list: LookupList): Promise<LookupOptionView[]> {
  return db.lookupOption.findMany({
    where: { orgId: user.orgId, list, active: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, label: true, active: true },
  });
}

/**
 * מפה code → תווית לתצוגה. כוללת גם ערכים שכובו, כי רשומות ישנות עדיין משתמשות בהם.
 * קוד שנמחק לגמרי מהטבלה מוצג כמו שהוא (עדיף מרשימה ריקה או קריסה).
 */
export async function getLabelMap(user: SessionUser, list: LookupList): Promise<(code: string) => string> {
  const rows = await db.lookupOption.findMany({ where: { orgId: user.orgId, list }, select: { code: true, label: true } });
  const map = new Map(rows.map((r) => [r.code, r.label]));
  return (code) => map.get(code) ?? code;
}

/**
 * בדיקה בשרת שקוד שנשלח מהטופס קיים, פעיל ושייך לארגון. zod לא יכול לבדוק זאת
 * כי הערכים תלויים במסד. מקבל tx כדי להיקרא בתוך הטרנזקציה של השמירה.
 */
export async function assertValidOption(
  tx: Prisma.TransactionClient,
  orgId: string,
  list: LookupList,
  code: string,
): Promise<void> {
  const found = await tx.lookupOption.findFirst({ where: { orgId, list, code, active: true }, select: { id: true } });
  if (!found) throw new ValidationError("הערך שנבחר אינו קיים ברשימה או שאינו פעיל");
}
