import { z } from "zod";

// סכמות zod משותפות. בכל Server Action הקלט מאומת כאן, בשרת, לפני שמגיעים לשירות.

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך חייב להיות בפורמט YYYY-MM-DD");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה חייבת להיות בפורמט HH:mm");

export const switchUserSchema = z.object({
  userId: z.string().min(1, "לא נבחר משתמש"),
});
