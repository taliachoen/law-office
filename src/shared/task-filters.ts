import { TASK_PRIORITIES, TASK_STATUSES } from "./constants";

// סינון רשימת המשימות (סעיף 6.4 במפרט). הסינון נשמר בכתובת (query string),
// ולכן כל ערך שמגיע משם מנוקה כאן: ערך לא מוכר פשוט לא מסנן.

export const TASK_DUE_FILTERS = ["overdue", "today", "week", "range"] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];
export const TASK_DUE_LABELS: Record<TaskDueFilter, string> = {
  overdue: "באיחור",
  today: "היום",
  week: "השבוע (עד שבת)",
  range: "טווח תאריכים",
};

export type TaskFilterParams = {
  /** "me" או מזהה משתמש; ריק = כולם */
  holder?: string;
  caseId?: string;
  status?: string;
  priority?: string;
  due?: TaskDueFilter;
  from?: string;
  to?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseTaskFilters(raw: Record<string, string | string[] | undefined>): TaskFilterParams {
  const from = one(raw.from);
  const to = one(raw.to);
  const status = one(raw.status);
  const priority = one(raw.priority);
  const requestedDue = one(raw.due);
  const validDue = requestedDue && (TASK_DUE_FILTERS as readonly string[]).includes(requestedDue) ? requestedDue : undefined;
  // overdue=1: קישורי לוח הבקרה. תאריך התחלה או סיום בלי סוג מועד נחשב טווח
  const due = validDue ?? (one(raw.overdue) === "1" ? "overdue" : from || to ? "range" : undefined);
  return {
    holder: one(raw.holder),
    caseId: one(raw.caseId),
    status: status && (TASK_STATUSES as readonly string[]).includes(status) ? status : undefined,
    priority: priority && (TASK_PRIORITIES as readonly string[]).includes(priority) ? priority : undefined,
    due: due as TaskDueFilter | undefined,
    from: from && ISO.test(from) ? from : undefined,
    to: to && ISO.test(to) ? to : undefined,
  };
}

/** המפתחות שמופיעים בכתובת, לבניית קישורים ולבדיקה אם יש סינון פעיל. */
export function activeFilterCount(f: TaskFilterParams): number {
  return [f.holder, f.caseId, f.status, f.priority, f.due].filter(Boolean).length;
}
