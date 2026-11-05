// ערכי סטטוס וסוגים כקבועי TypeScript (במסד הם String, כדי שהמעבר ל-Postgres יהיה פשוט).
// כל קבוצה מוגדרת כ-tuple כדי ש-zod ו-TypeScript יצאו מאותו מקור.
// הקובץ מכיל רק סטטוסים של מערכת, שהלוגיקה תלויה בהם.

export const ROLES = ["MANAGER", "EMPLOYEE", "SECRETARY"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: "מנהלת",
  EMPLOYEE: "עובד/ת",
  SECRETARY: "מזכירות",
};

export const CLIENT_TYPES = ["PERSON", "COMPANY"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  PERSON: "אדם פרטי",
  COMPANY: "חברה",
};

export const CASE_STATUSES = ["ACTIVE", "PENDING", "CLOSED"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ACTIVE: "פעיל",
  PENDING: "בהמתנה",
  CLOSED: "סגור",
};

// רשימות הניתנות להגדרה לפי ארגון (סוגי תיקים, ערכאות, סוגי חומר חדש) נשמרות בטבלה LookupOption.
// כאן רק שמות הרשימות; ערכי ברירת המחדל ב-lookup-defaults.ts.
export const LOOKUP_LISTS = ["CASE_TYPE", "COURT", "INBOX_KIND", "CONTACT_STATUS"] as const;
export type LookupList = (typeof LOOKUP_LISTS)[number];

export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "נמוכה",
  NORMAL: "רגילה",
  HIGH: "גבוהה",
  URGENT: "דחופה",
};

export const TASK_STATUSES = ["OPEN", "ASSIGNED", "IN_REVIEW", "CHANGES_REQUESTED", "COMPLETED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "פתוחה",
  ASSIGNED: "אצל העובד",
  IN_REVIEW: "ממתינה לבדיקה",
  CHANGES_REQUESTED: "הוחזרה לתיקון",
  COMPLETED: "הושלמה",
};

export const TASK_EVENT_TYPES = [
  "CREATED",
  "UPDATED",
  "ASSIGNED",
  "SUBMITTED_FOR_REVIEW",
  "CHANGES_REQUESTED",
  "COMPLETED",
  "REOPENED",
  "DELETED",
  "RESTORED",
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];
export const TASK_EVENT_LABELS: Record<TaskEventType, string> = {
  CREATED: "המשימה נוצרה",
  UPDATED: "המשימה עודכנה",
  ASSIGNED: "הועברה לעובד",
  SUBMITTED_FOR_REVIEW: "הוגשה לבדיקה",
  CHANGES_REQUESTED: "הוחזרה לתיקון",
  COMPLETED: "הושלמה",
  REOPENED: "נפתחה מחדש",
  DELETED: "נמחקה (סל מחזור)",
  RESTORED: "שוחזרה",
};

export const DOCUMENT_SOURCES = ["UPLOAD", "EMAIL", "DROPBOX"] as const;
export type DocumentSource = (typeof DOCUMENT_SOURCES)[number];
export const DOCUMENT_SOURCE_LABELS: Record<DocumentSource, string> = {
  UPLOAD: "העלאה",
  EMAIL: "מייל",
  DROPBOX: "Dropbox",
};

export const DEADLINE_TYPES = ["HEARING", "LEGAL_DEADLINE", "INTERNAL_TARGET"] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  HEARING: "דיון",
  LEGAL_DEADLINE: "מועד משפטי",
  INTERNAL_TARGET: "יעד פנימי",
};

export const DEADLINE_VERIFICATIONS = ["PENDING", "VERIFIED"] as const;
export type DeadlineVerification = (typeof DEADLINE_VERIFICATIONS)[number];
export const DEADLINE_VERIFICATION_LABELS: Record<DeadlineVerification, string> = {
  PENDING: "ממתין לאימות עו״ד",
  VERIFIED: "אומת",
};

export const INTEGRATION_PROVIDERS = ["GMAIL", "CALENDAR", "DROPBOX"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_STATUSES = ["NOT_CONFIGURED", "MOCK_CONNECTED"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];
export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  NOT_CONFIGURED: "לא מוגדר",
  MOCK_CONNECTED: "מחובר – דמה",
};
