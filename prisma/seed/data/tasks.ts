import type { TaskPriority, TaskStatus } from "../../../src/shared/constants";
import type { UserKey } from "./users";

// 25 משימות בכל המצבים. caseIdx מפנה למערך התיקים; assignee חייב להיות חבר בתיק
// (index.ts בודק זאת ונכשל אם לא). dueOffset = ימים מהיום (שלילי = באיחור).
// את אירועי ה-TaskEvent ואת שדה completionSummary index.ts בונה לפי הסטטוס וההערות שכאן:
//   submitNote  - הערת העובד בהגשה לבדיקה (מצבים IN_REVIEW ואילך)
//   returnNote  - הערת המנהלת בהחזרה לתיקון (CHANGES_REQUESTED)
//   summary     - סיכום ביצוע (COMPLETED)
export type SeedTask = {
  caseIdx: number;
  title: string;
  instructions?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: UserKey;
  dueOffset?: number;
  createdDaysAgo: number;
  submitNote?: string;
  returnNote?: string;
  summary?: string;
};

export const tasks: SeedTask[] = [
  // ---- OPEN (4) ----
  { caseIdx: 0, title: "איסוף אישורי הכנסה מהלקוחה", status: "OPEN", priority: "NORMAL", dueOffset: 10, createdDaysAgo: 3 },
  { caseIdx: 7, title: "תרגום מסמך מצורף", status: "OPEN", priority: "LOW", dueOffset: 14, createdDaysAgo: 2 },
  { caseIdx: 10, title: "איסוף תעודות פטירה", status: "OPEN", priority: "NORMAL", dueOffset: 8, createdDaysAgo: 4 },
  { caseIdx: 11, title: "פגישת היכרות – הכנת שאלון", status: "OPEN", priority: "LOW", dueOffset: 12, createdDaysAgo: 1 },

  // ---- ASSIGNED (7), מהן שתיים באיחור ----
  { caseIdx: 0, title: "הכנת טיוטת כתב תביעה", instructions: "לפי המודל שבתיקיית התיקים; לצרף נספח רכוש.",
    status: "ASSIGNED", priority: "NORMAL", assignee: "employeeA", dueOffset: 5, createdDaysAgo: 6 },
  { caseIdx: 0, title: "הכנת בקשה לקבלת מסמכים מהצד שכנגד", status: "ASSIGNED", priority: "NORMAL",
    assignee: "employeeA", dueOffset: 9, createdDaysAgo: 2 },
  { caseIdx: 3, title: "איתור נכסי מקרקעין ברשם", instructions: "לאתר גם נכסים שרשומים על שם צד שלישי.",
    status: "ASSIGNED", priority: "NORMAL", assignee: "employeeA", dueOffset: -2, createdDaysAgo: 12 },
  { caseIdx: 6, title: "הכנת רשימת עדים", status: "ASSIGNED", priority: "NORMAL", assignee: "employeeB", dueOffset: 6, createdDaysAgo: 4 },
  { caseIdx: 7, title: "בדיקת חוות דעת שמאי", status: "ASSIGNED", priority: "HIGH", assignee: "employeeA", dueOffset: 3, createdDaysAgo: 5 },
  { caseIdx: 5, title: "הכנת בקשה למזונות זמניים", instructions: "דחוף: לצרף תלושי שכר ופירוט הוצאות הילדים.",
    status: "ASSIGNED", priority: "URGENT", assignee: "employeeB", dueOffset: -1, createdDaysAgo: 9 },
  { caseIdx: 8, title: "טיוטת הסכם ממון", status: "ASSIGNED", priority: "NORMAL", assignee: "employeeB", dueOffset: 9, createdDaysAgo: 3 },

  // ---- IN_REVIEW (5) ----
  { caseIdx: 1, title: "בדיקת תצהיר לקראת דיון", status: "IN_REVIEW", priority: "HIGH", assignee: "employeeA",
    dueOffset: 2, createdDaysAgo: 8, submitNote: "התצהיר מצורף, חסר רק אישור על הוצאות החינוך." },
  { caseIdx: 3, title: "עדכון טבלת איזון משאבים", status: "IN_REVIEW", priority: "NORMAL", assignee: "employeeA",
    dueOffset: 7, createdDaysAgo: 10, submitNote: "הטבלה עודכנה לפי שווי הדירה העדכני." },
  { caseIdx: 6, title: "תגובה לבקשה זמנית", status: "IN_REVIEW", priority: "URGENT", assignee: "employeeA",
    dueOffset: 1, createdDaysAgo: 4, submitNote: "טיוטת התגובה מוכנה לבדיקה." },
  { caseIdx: 10, title: "הכנת בקשה לצו ירושה", status: "IN_REVIEW", priority: "NORMAL", assignee: "employeeB",
    dueOffset: 5, createdDaysAgo: 7, submitNote: "הבקשה מוכנה; ממתין לאישור הלקוחה על הנוסח." },
  { caseIdx: 2, title: "בדיקת חישוב מזונות", status: "IN_REVIEW", priority: "HIGH", assignee: "employeeA",
    dueOffset: 2, createdDaysAgo: 5, submitNote: "החישוב מצורף בגיליון." },

  // ---- CHANGES_REQUESTED (3) ----
  { caseIdx: 2, title: "ניסוח הסכם הורות – טיוטה ראשונה", status: "CHANGES_REQUESTED", priority: "HIGH",
    assignee: "employeeA", dueOffset: 4, createdDaysAgo: 11, submitNote: "טיוטה ראשונה מצורפת.",
    returnNote: "לתקן את סעיף החגים ולהוסיף סעיף על נסיעות לחו\"ל." },
  { caseIdx: 5, title: "איסוף תלושי שכר", status: "CHANGES_REQUESTED", priority: "NORMAL", assignee: "employeeB",
    dueOffset: 3, createdDaysAgo: 8, submitNote: "צורפו שני תלושים.",
    returnNote: "חסרים שלושה חודשים אחרונים. להשלים מהלקוח." },
  { caseIdx: 6, title: "תיקון נוסח התצהיר", status: "CHANGES_REQUESTED", priority: "HIGH", assignee: "employeeB",
    dueOffset: 2, createdDaysAgo: 6, submitNote: "נוסח מתוקן מצורף.",
    returnNote: "לפשט את הפסקה השלישית ולהוסיף אסמכתא." },

  // ---- COMPLETED (6) ----
  { caseIdx: 1, title: "הגשת בקשה לדחיית מועד", status: "COMPLETED", priority: "HIGH", assignee: "employeeA",
    dueOffset: -3, createdDaysAgo: 14, submitNote: "הבקשה הוגשה, אישור הגשה מצורף.",
    summary: "הבקשה הוגשה במועד והתקבלה. הדיון נדחה." },
  { caseIdx: 2, title: "סיכום פגישה עם הלקוחה", status: "COMPLETED", priority: "LOW", assignee: "employeeA",
    dueOffset: -10, createdDaysAgo: 20, submitNote: "הסיכום מצורף.",
    summary: "הסיכום נבדק ונשמר בתיק." },
  { caseIdx: 4, title: "סגירת תיק – העברת מסמכים ללקוחה", status: "COMPLETED", priority: "LOW", assignee: "employeeA",
    dueOffset: -20, createdDaysAgo: 30, submitNote: "המסמכים נמסרו ללקוחה.",
    summary: "כל המסמכים נמסרו, התיק נסגר." },
  { caseIdx: 8, title: "בדיקת היסטוריית פעילות בחשבונות", status: "COMPLETED", priority: "NORMAL", assignee: "employeeB",
    dueOffset: -5, createdDaysAgo: 16, submitNote: "הדוחות מצורפים.",
    summary: "לא נמצאו חריגות. הדוחות נשמרו בתיק." },
  { caseIdx: 9, title: "העברת חומר לארכיון", status: "COMPLETED", priority: "LOW", assignee: "employeeB",
    dueOffset: -15, createdDaysAgo: 25, submitNote: "החומר הועבר.",
    summary: "החומר הועבר לארכיון הדיגיטלי." },
  { caseIdx: 14, title: "סיכום פסיקה בנושא אפוטרופסות", status: "COMPLETED", priority: "NORMAL",
    dueOffset: -4, createdDaysAgo: 13, summary: "הסיכום הושלם על ידי המנהלת ונשמר בתיק." },
];
