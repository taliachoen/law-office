import { notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/server/errors";

/**
 * מריץ טעינת נתונים של דף. NotFound -> דף 404; Forbidden -> מחזיר { forbidden: true }
 * כדי שהדף יציג "אין הרשאה" (בלי הנתונים). כל שגיאה אחרת עולה ל-error.tsx.
 */
export async function guard<T>(load: () => Promise<T>): Promise<{ forbidden: false; data: T } | { forbidden: true }> {
  try {
    return { forbidden: false, data: await load() };
  } catch (err) {
    if (err instanceof ForbiddenError) return { forbidden: true };
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
