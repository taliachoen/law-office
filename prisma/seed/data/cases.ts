import type { CaseStatus, CaseType, Court } from "../../../src/shared/constants";
import type { UserKey } from "./users";

// 15 תיקים. clientIdx מפנה למערך הלקוחות.
// חברות בתיק (members): עובד א' בתיקים 0,1,2,3,4,6,7; עובדת ב' בתיקים 5,6,7,8,9,10.
// תיקים 6 ו-7 משותפים; תיקים 11-14 למנהלת בלבד (כדי לבדוק שעובד לא רואה תיק שאינו שלו).
// סגורים: 4, 9, 13.
export type SeedCase = {
  clientIdx: number;
  title: string;
  internalNumber: string;
  courtCaseNumber?: string;
  caseType: CaseType;
  court?: Court;
  opposingParty?: string;
  opposingCounsel?: string;
  /** נשמר כאן כדי ש-emails.ts יוכל ליצור מיילים תואמים */
  opposingCounselEmail?: string;
  responsible: UserKey;
  status: CaseStatus;
  summary?: string;
  nextAction?: string;
  members: UserKey[];
};

const dropbox = (n: string) => `/תיקים/${n}`;
export const dropboxPathFor = (internalNumber: string) => dropbox(internalNumber);

export const cases: SeedCase[] = [
  {
    clientIdx: 0, title: "לביא – גירושין", internalNumber: "2026-001", courtCaseNumber: "12345-01-26",
    caseType: "DIVORCE", court: "FAMILY_COURT", opposingParty: "אלון לביא", opposingCounsel: "עו\"ד קרן שדה",
    opposingCounselEmail: "keren@opposing.example.test", responsible: "manager", status: "ACTIVE",
    summary: "הוגשה תביעת גירושין. הצדדים מנהלים משא ומתן על חלוקת רכוש.", nextAction: "להשלים טיוטת כתב תביעה",
    members: ["employeeA"],
  },
  {
    clientIdx: 1, title: "מזרחי – מזונות ילדים", internalNumber: "2026-002", courtCaseNumber: "23456-02-26",
    caseType: "ALIMONY", court: "FAMILY_COURT", opposingParty: "הדס מזרחי", opposingCounsel: "עו\"ד יובל נחום",
    opposingCounselEmail: "yuval@opposing.example.test", responsible: "employeeA", status: "ACTIVE",
    summary: "תביעת מזונות לשני ילדים קטינים.", nextAction: "הכנת תצהיר לקראת דיון",
    members: ["employeeA"],
  },
  {
    clientIdx: 2, title: "אברהמי – משמורת וזמני שהות", internalNumber: "2026-003", courtCaseNumber: "34567-03-26",
    caseType: "CUSTODY", court: "FAMILY_COURT", opposingParty: "דורון אברהמי", opposingCounsel: "עו\"ד מיכאל ברק",
    opposingCounselEmail: "michael@opposing.example.test", responsible: "manager", status: "ACTIVE",
    summary: "מחלוקת על זמני שהות בחגים ובחופשות.", nextAction: "להכין עמדה לקראת הערכת גורם מקצועי",
    members: ["employeeA"],
  },
  {
    clientIdx: 3, title: "כץ – איזון משאבים", internalNumber: "2026-004",
    caseType: "PROPERTY_BALANCE", court: "FAMILY_COURT", opposingParty: "יעל כץ", opposingCounsel: "עו\"ד שירה אלמוג",
    opposingCounselEmail: "shira@opposing.example.test", responsible: "employeeA", status: "ACTIVE",
    summary: "איזון משאבים לאחר פירוק שיתוף; יש דירה ושני כלי רכב.", nextAction: "איתור נכסים ושמאות",
    members: ["employeeA"],
  },
  {
    clientIdx: 4, title: "פרידמן – גירושין בהסכמה", internalNumber: "2025-041", courtCaseNumber: "45678-11-25",
    caseType: "DIVORCE", court: "RABBINICAL_COURT", opposingParty: "עידו פרידמן",
    responsible: "manager", status: "CLOSED",
    summary: "ההסכם אושר וניתן גט. התיק נסגר.", members: ["employeeA"],
  },
  {
    clientIdx: 5, title: "שמעוני – מזונות זמניים", internalNumber: "2026-005", courtCaseNumber: "56789-04-26",
    caseType: "ALIMONY", court: "FAMILY_COURT", opposingParty: "קרן שמעוני", opposingCounsel: "עו\"ד אילן רום",
    opposingCounselEmail: "ilan@opposing.example.test", responsible: "manager", status: "ACTIVE",
    summary: "בקשה למזונות זמניים עד לסיום ההליך העיקרי.", nextAction: "איסוף תלושי שכר מהלקוח",
    members: ["employeeB"],
  },
  {
    clientIdx: 6, title: "בן דוד – גירושין ומשמורת", internalNumber: "2026-006", courtCaseNumber: "67890-05-26",
    caseType: "CUSTODY", court: "FAMILY_COURT", opposingParty: "איתי בן דוד", opposingCounsel: "עו\"ד נטע גל",
    opposingCounselEmail: "neta@opposing.example.test", responsible: "manager", status: "ACTIVE",
    summary: "הליך משולב: גירושין ומשמורת על שלושה ילדים.", nextAction: "תגובה לבקשה זמנית",
    members: ["employeeA", "employeeB"],
  },
  {
    clientIdx: 7, title: "גולן – רכוש ואיזון משאבים", internalNumber: "2026-007", courtCaseNumber: "78901-06-26",
    caseType: "PROPERTY_BALANCE", court: "DISTRICT_COURT", opposingParty: "מור גולן", opposingCounsel: "עו\"ד דור לוין",
    opposingCounselEmail: "dor@opposing.example.test", responsible: "manager", status: "ACTIVE",
    summary: "ערעור על החלטה בעניין איזון משאבים.", nextAction: "בדיקת חוות דעת שמאי",
    members: ["employeeA", "employeeB"],
  },
  {
    clientIdx: 8, title: "חזן – הסכם ממון", internalNumber: "2026-008",
    caseType: "PRENUP", opposingParty: "בן זוגה לעתיד – דמה", responsible: "employeeB", status: "ACTIVE",
    summary: "ניסוח הסכם ממון לפני נישואין.", nextAction: "הכנת טיוטה ראשונה",
    members: ["employeeB"],
  },
  {
    clientIdx: 9, title: "רוזן – מזונות", internalNumber: "2025-038", courtCaseNumber: "89012-09-25",
    caseType: "ALIMONY", court: "FAMILY_COURT", opposingParty: "תום רוזן", opposingCounsel: "עו\"ד אורית פז",
    opposingCounselEmail: "orit@opposing.example.test", responsible: "manager", status: "CLOSED",
    summary: "ניתן פסק דין והושג הסדר תשלומים. התיק נסגר.", members: ["employeeB"],
  },
  {
    clientIdx: 10, title: "דמה השקעות – אפוטרופסות", internalNumber: "2026-009", courtCaseNumber: "90123-07-26",
    caseType: "GUARDIANSHIP", court: "FAMILY_COURT", opposingParty: "—", responsible: "employeeB", status: "ACTIVE",
    summary: "מינוי אפוטרופוס לנכס מניב של בעל מניות שאינו כשיר.", nextAction: "הכנת בקשה לצו ירושה",
    members: ["employeeB"],
  },
  {
    clientIdx: 11, title: "אשכנזי – צוואה וירושה", internalNumber: "2026-010",
    caseType: "WILLS_INHERITANCE", responsible: "manager", status: "PENDING",
    summary: "שאלה ראשונית בעניין צוואה הדדית. ממתינים למסמכים מהלקוח.", nextAction: "פגישת היכרות",
    members: [],
  },
  {
    clientIdx: 0, title: "לביא – הסדר רכוש (חלק ב')", internalNumber: "2026-011",
    caseType: "PROPERTY_BALANCE", court: "FAMILY_COURT", opposingParty: "אלון לביא",
    responsible: "manager", status: "PENDING",
    summary: "הליך נפרד לחלוקת פנסיה. טרם הוגשה תביעה.", nextAction: "בדיקת פסיקה בנושא משמורת משותפת",
    members: [],
  },
  {
    clientIdx: 3, title: "כץ – הסכם ממון קודם", internalNumber: "2025-030",
    caseType: "PRENUP", responsible: "manager", status: "CLOSED",
    summary: "הסכם הממון נחתם ואושר. התיק נסגר.", members: [],
  },
  {
    clientIdx: 11, title: "אשכנזי – אפוטרופסות לאב", internalNumber: "2026-012",
    caseType: "GUARDIANSHIP", court: "FAMILY_COURT", responsible: "manager", status: "ACTIVE",
    summary: "בקשה למינוי אפוטרופוס לאב המבוגר.", nextAction: "סיכום פסיקה בנושא אפוטרופסות",
    members: [],
  },
];
