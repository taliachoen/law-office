"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { switchUserSchema } from "@/shared/schemas";
import { DEV_USER_COOKIE, getCurrentUser } from "./current-user";

// Server Action של בורר המשתמשים (דגם בלבד).
// גם כאן הקלט מאומת בשרת, ובודקים שהמשתמש קיים, פעיל ושייך לאותו ארגון.
export async function switchUser(input: { userId: string }): Promise<{ ok: boolean; error?: string }> {
  const parsed = switchUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "בחירת המשתמש לא תקינה" };

  const current = await getCurrentUser();
  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, orgId: current.orgId, active: true },
  });
  if (!target) return { ok: false, error: "המשתמש לא נמצא" };

  (await cookies()).set(DEV_USER_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
