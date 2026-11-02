import { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

// עטיפה אחידה ל-Server Actions: אימות zod, הפעלת השירות, והמרת שגיאות להודעה בעברית.
// שגיאה בלתי צפויה לא מדליפה פרטים טכניים למשתמש; היא נרשמת בלוג השרת בלבד.
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** מזהה שנוצר, למשל כדי לנווט לדף הרשומה */
  id?: string;
};

export const initialActionState: ActionState = { ok: false };

export async function runAction<S extends z.ZodType>(
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>) => Promise<{ id?: string } | void>,
): Promise<ActionState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors };
  }
  try {
    const result = await fn(parsed.data);
    return { ok: true, id: result?.id };
  } catch (err) {
    if (
      err instanceof ForbiddenError ||
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    ) {
      return { ok: false, error: err.message };
    }
    console.error(err);
    return { ok: false, error: "אירעה שגיאה. נסו שוב" };
  }
}
