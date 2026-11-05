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

/** ההפרש (באלפיות שנייה) בין שעון ישראל ל-UTC ברגע נתון. */
function israelOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OFFICE_TIME_ZONE, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** ממיר ערך של שדה datetime-local ("YYYY-MM-DDTHH:mm", שעון ישראל) לרגע בזמן. */
export function israelLocalToDate(local: string): Date {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart!.split("-").map(Number);
  const [h, min] = timePart!.split(":").map(Number);
  const naive = Date.UTC(y!, m! - 1, d!, h!, min!);
  // שתי איטרציות מטפלות גם בשעות שסמוכות למעבר שעון קיץ
  let result = naive - israelOffsetMs(new Date(naive));
  result = naive - israelOffsetMs(new Date(result));
  return new Date(result);
}

/** הפעולה ההפוכה: רגע בזמן לערך של שדה datetime-local בשעון ישראל. */
export function dateToIsraelLocal(date: Date): string {
  return new Date(date.getTime() + israelOffsetMs(date)).toISOString().slice(0, 16);
}

/** יום בשבוע (0 = ראשון ... 6 = שבת) של תאריך YYYY-MM-DD. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}
