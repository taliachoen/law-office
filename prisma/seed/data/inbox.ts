import type { DefaultCode } from "../../../src/shared/lookup-defaults";
import type { UserKey } from "./users";

// 10 פריטי חומר חדש (בלי קבצים בשלב 1). caseIdx = null הוא "לשיוך".
// 7 לא נצפו, 3 נצפו על ידי המנהלת. 2 דחופים, 2 "לשיוך".
export type SeedInboxItem = {
  caseIdx: number | null;
  kind: DefaultCode<"INBOX_KIND">;
  title: string;
  note?: string;
  sourceLink?: string;
  urgent: boolean;
  viewed: boolean;
  createdBy: UserKey;
  createdDaysAgo: number;
};

export const inboxItems: SeedInboxItem[] = [
  { caseIdx: 0, kind: "COURT_DECISION", title: "החלטה בבקשה לדחיית מועד", urgent: true, viewed: false,
    createdBy: "manager", createdDaysAgo: 0, note: "התקבלה היום בדואר הנכנס של בית המשפט." },
  { caseIdx: 1, kind: "OPPOSING_PLEADING", title: "כתב הגנה מטעם הצד שכנגד", urgent: true, viewed: false,
    createdBy: "employeeA", createdDaysAgo: 1, note: "יש לבדוק מועד להגשת תגובה." },
  { caseIdx: 2, kind: "CLIENT_DOCUMENT", title: "תלושי שכר – שלושה חודשים", urgent: false, viewed: false,
    createdBy: "employeeA", createdDaysAgo: 2 },
  { caseIdx: null, kind: "LETTER", title: "מכתב מבא כוח הצד שכנגד – לא ברור לאיזה תיק", urgent: false,
    viewed: false, createdBy: "employeeA", createdDaysAgo: 1, note: "נראה שקשור לאחד מתיקי המשפחה." },
  { caseIdx: null, kind: "OTHER", title: "מסמך סרוק ללא כותרת", urgent: false, viewed: false,
    createdBy: "employeeB", createdDaysAgo: 3 },
  { caseIdx: 5, kind: "COURT_DECISION", title: "החלטה בבקשה למזונות זמניים", urgent: false, viewed: true,
    createdBy: "manager", createdDaysAgo: 6 },
  { caseIdx: 6, kind: "CLIENT_DOCUMENT", title: "אישור מהבנק", urgent: false, viewed: true,
    createdBy: "employeeB", createdDaysAgo: 8 },
  { caseIdx: 8, kind: "LETTER", title: "מכתב התראה", urgent: false, viewed: false,
    createdBy: "employeeB", createdDaysAgo: 2, sourceLink: "https://example.test/demo-letter" },
  { caseIdx: 10, kind: "OTHER", title: "צילום תעודת זהות", urgent: false, viewed: true,
    createdBy: "employeeB", createdDaysAgo: 10 },
  { caseIdx: 3, kind: "CLIENT_DOCUMENT", title: "דוח מקרקעין", urgent: false, viewed: false,
    createdBy: "employeeA", createdDaysAgo: 4 },
];
