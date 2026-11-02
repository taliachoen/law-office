import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { authorize } from "@/server/policy";
import { ROLES, type Role } from "@/shared/constants";

export type UserOption = { id: string; name: string; role: Role };

/** משתמשים פעילים לבחירה בטפסים ובסינון (אחראי על תיק, שיוך עובדים). למנהלת בלבד. */
export async function listAssignableUsers(user: SessionUser): Promise<UserOption[]> {
  authorize(user, "case:write", { orgId: user.orgId });
  const rows = await db.user.findMany({
    where: { orgId: user.orgId, active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
  return rows.map((r) => {
    if (!(ROLES as readonly string[]).includes(r.role)) throw new Error(`תפקיד לא תקין במסד: ${r.role}`);
    return { id: r.id, name: r.name, role: r.role as Role };
  });
}
