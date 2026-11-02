// תאריך בלי שעה נשמר כמחרוזת YYYY-MM-DD. "היום" ותצוגה נקבעים לפי Asia/Jerusalem,
// ולא לפי אזור הזמן של השרת, כדי שמועד לא יזוז ביום בגלל הפרש שעות.

export const OFFICE_TIME_ZONE = "Asia/Jerusalem";

/** התאריך של היום בישראל, כ-YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  // en-CA מחזיר בדיוק YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** מוסיף ימים (גם שליליים) למחרוזת YYYY-MM-DD. חישוב ב-UTC, ולכן בלי בעיות שעון קיץ. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD ל-DD.MM.YYYY לתצוגה. */
export function formatDateHe(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** תצוגת תאריך ושעה של רגע בזמן (למשל createdAt) לפי שעון ישראל. */
export function formatDateTimeHe(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: OFFICE_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
