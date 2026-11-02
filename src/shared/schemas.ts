import { z } from "zod";
import { CASE_STATUSES, CLIENT_TYPES, TASK_PRIORITIES } from "./constants";
import { TASK_COMMANDS } from "./task-flow";

// סכמות zod משותפות. בכל Server Action הקלט מאומת כאן, בשרת, לפני שמגיעים לשירות.

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך חייב להיות בפורמט YYYY-MM-DD");

/** תאריך אמיתי בפורמט YYYY-MM-DD (דוחה למשל 2026-02-31). */
export const realIsoDateSchema = isoDateSchema.refine((d) => {
  const parsed = new Date(`${d}T00:00:00Z`);
  // תאריך כמו 2026-13-45 נותן Invalid Date, ו-2026-02-31 מתגלגל לחודש הבא: שניהם נדחים
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
}, "תאריך לא קיים");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה חייבת להיות בפורמט HH:mm");

export const switchUserSchema = z.object({
  userId: z.string().min(1, "לא נבחר משתמש"),
});

/** שדה טופס אופציונלי: מחרוזת ריקה נחשבת כ"לא מולא" (undefined). */
const blankable = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const idField = (message: string) => z.string({ error: message }).min(1, message);

// ---- לקוחות ----

export const clientInputSchema = z.object({
  type: z.enum(CLIENT_TYPES, { error: "יש לבחור סוג לקוח" }),
  fullName: z.string({ error: "יש להזין שם" }).trim().min(2, "יש להזין שם (לפחות 2 תווים)").max(120, "עד 120 תווים"),
  idNumber: blankable(z.string().trim().regex(/^\d{5,9}$/, "ת״ז או ח״פ: 5 עד 9 ספרות")),
  phone: blankable(z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין")),
  email: blankable(z.email("כתובת מייל לא תקינה")),
  address: blankable(z.string().trim().max(200, "עד 200 תווים")),
  notes: blankable(z.string().trim().max(2000, "עד 2000 תווים")),
});
export type ClientInput = z.infer<typeof clientInputSchema>;

export const contactInputSchema = z.object({
  clientId: idField("לקוח לא נבחר"),
  name: z.string({ error: "יש להזין שם" }).trim().min(2, "יש להזין שם (לפחות 2 תווים)").max(120, "עד 120 תווים"),
  relation: z.string({ error: "יש להזין קרבה" }).trim().min(1, "יש להזין קרבה (למשל: אחות)").max(60, "עד 60 תווים"),
  phone: blankable(z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין")),
  email: blankable(z.email("כתובת מייל לא תקינה")),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

// ---- תיקים ----

export const caseInputSchema = z.object({
  clientId: idField("יש לבחור לקוח"),
  title: z.string({ error: "יש להזין כותרת" }).trim().min(2, "יש להזין כותרת (לפחות 2 תווים)").max(200, "עד 200 תווים"),
  courtCaseNumber: blankable(z.string().trim().max(50, "עד 50 תווים")),
  caseType: idField("יש לבחור סוג תיק"),
  court: blankable(z.string().min(1)),
  opposingParty: blankable(z.string().trim().max(120, "עד 120 תווים")),
  opposingCounsel: blankable(z.string().trim().max(120, "עד 120 תווים")),
  responsibleUserId: idField("יש לבחור אחראי"),
  status: z.enum(CASE_STATUSES, { error: "יש לבחור סטטוס" }),
  summary: blankable(z.string().trim().max(4000, "עד 4000 תווים")),
  nextAction: blankable(z.string().trim().max(500, "עד 500 תווים")),
});
export type CaseInput = z.infer<typeof caseInputSchema>;

// הלקוח של תיק קיים לא משתנה, וגרסת הרשומה (version) נדרשת לנעילה אופטימית
export const caseUpdateSchema = caseInputSchema.omit({ clientId: true }).extend({
  version: z.coerce.number({ error: "גרסה לא תקינה" }).int().positive(),
});
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

export const caseMembersSchema = z.object({
  caseId: idField("תיק לא נבחר"),
  userIds: z.array(z.string().min(1)),
});

/** FormData -> אובייקט רגיל לאימות zod. שדות חוזרים (checkbox) הופכים למערך. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

// ---- משימות ----

export const taskInputSchema = z.object({
  caseId: idField("יש לבחור תיק"),
  title: z.string({ error: "יש להזין כותרת" }).trim().min(2, "יש להזין כותרת (לפחות 2 תווים)").max(200, "עד 200 תווים"),
  instructions: blankable(z.string().trim().max(4000, "עד 4000 תווים")),
  priority: z.enum(TASK_PRIORITIES, { error: "יש לבחור עדיפות" }),
  assigneeId: blankable(z.string().min(1)),
  dueDate: blankable(realIsoDateSchema),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

// מעבר במכונת המצבים. חובת הטקסט (הערה/סיכום/סיבה) נאכפת בשירות לפי הפקודה.
export const taskCommandSchema = z.object({
  taskId: idField("משימה לא נבחרה"),
  command: z.enum(TASK_COMMANDS, { error: "פעולה לא מוכרת" }),
  version: z.coerce.number({ error: "גרסה לא תקינה" }).int().positive(),
  text: blankable(z.string().trim().max(4000, "עד 4000 תווים")),
  assigneeId: blankable(z.string().min(1)),
});
export type TaskCommandInput = z.infer<typeof taskCommandSchema>;
