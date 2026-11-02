import { cookies } from "next/headers";
import { db } from "@/server/db";
import { ROLES, type Role } from "@/shared/constants";
import type { SessionUser } from "./session-user";

// הנקודה היחידה במערכת שיודעת מי המשתמש הנוכחי.
// בדגם: cookie שנקבע מבורר המשתמשים. בגרסה האמיתית מחליפים את גוף
// getCurrentUser בקריאה ל-Supabase Auth, והחתימה (SessionUser) נשארת זהה.
export const DEV_USER_COOKIE = "dev-user-id";

function toRole(value: string): Role {
  if ((ROLES as readonly string[]).includes(value)) return value as Role;
  throw new Error(`תפקיד לא תקין במסד: ${value}`);
}

export async function getCurrentUser(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const id = cookieStore.get(DEV_USER_COOKIE)?.value;

  // cookie ישן או מזויף לא נותן גישה: אם המשתמש לא קיים או לא פעיל, חוזרים למנהלת
  let user = id ? await db.user.findFirst({ where: { id, active: true } }) : null;
  user ??= await db.user.findFirst({
    where: { role: "MANAGER", active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!user) throw new Error("לא נמצאו משתמשים במסד. הריצו npm run db:reset");

  return { id: user.id, orgId: user.orgId, name: user.name, role: toRole(user.role) };
}

/** רשימת המשתמשים לבורר (דגם בלבד). */
export async function listSwitchableUsers(orgId: string) {
  const users = await db.user.findMany({
    where: { orgId, active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name, role: toRole(u.role) }));
}
