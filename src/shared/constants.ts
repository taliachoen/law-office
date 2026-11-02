// ערכי סטטוס וסוגים כקבועי TypeScript (במסד הם String, כדי שהמעבר ל-Postgres יהיה פשוט).
// כל קבוצה מוגדרת כ-tuple כדי ש-zod ו-TypeScript יצאו מאותו מקור.

export const ROLES = ["MANAGER", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: "מנהלת",
  EMPLOYEE: "עובד/ת",
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

export const CASE_TYPES = [
  "DIVORCE",
  "ALIMONY",
  "CUSTODY",
  "PROPERTY_BALANCE",
  "PRENUP",
  "WILLS_INHERITANCE",
  "GUARDIANSHIP",
  "OTHER",
] as const;
export type CaseType = (typeof CASE_TYPES)[number];
export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  DIVORCE: "גירושין",
  ALIMONY: "מזונות",
  CUSTODY: "משמורת וזמני שהות",
  PROPERTY_BALANCE: "רכוש ואיזון משאבים",
  PRENUP: "הסכם ממון",
  WILLS_INHERITANCE: "צוואות וירושות",
  GUARDIANSHIP: "אפוטרופסות",
  OTHER: "אחר",
};

export const COURTS = ["FAMILY_COURT", "RABBINICAL_COURT", "DISTRICT_COURT", "SUPREME_COURT", "OTHER"] as const;
export type Court = (typeof COURTS)[number];
export const COURT_LABELS: Record<Court, string> = {
  FAMILY_COURT: "בית משפט לענייני משפחה",
  RABBINICAL_COURT: "בית הדין הרבני",
  DISTRICT_COURT: "בית משפט מחוזי",
  SUPREME_COURT: "בית המשפט העליון",
  OTHER: "אחר",
};

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

export const INBOX_KINDS = ["COURT_DECISION", "OPPOSING_PLEADING", "CLIENT_DOCUMENT", "LETTER", "OTHER"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];
export const INBOX_KIND_LABELS: Record<InboxKind, string> = {
  COURT_DECISION: "החלטת בית משפט",
  OPPOSING_PLEADING: "כתב טענות של צד שכנגד",
  CLIENT_DOCUMENT: "מסמך מהלקוח",
  LETTER: "מכתב",
  OTHER: "אחר",
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
