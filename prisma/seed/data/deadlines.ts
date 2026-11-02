import type { DeadlineType, DeadlineVerification } from "../../../src/shared/constants";
import type { DefaultCode } from "../../../src/shared/lookup-defaults";
import type { UserKey } from "./users";

// 20 מועדים: 18 בעתיד (0-29 ימים מהיום) ו-2 שעברו. offset = ימים מהיום.
// מועדים שעברו מסומנים done=false כדי שיופיעו כ"פספוס" בבדיקות העתידיות.
// מועד משפטי שלא אומת נשאר PENDING (המערכת לא מחשבת מועדים משפטיים).
export type SeedDeadline = {
  caseIdx: number;
  type: DeadlineType;
  title: string;
  offset: number;
  time?: string;
  court?: DefaultCode<"COURT">;
  location?: string;
  sourceDescription?: string;
  /** offsets יחסיים להיום, לתאריך ההחלטה / ההמצאה (שליליים) */
  decisionOffset?: number;
  serviceOffset?: number;
  responsible: UserKey;
  verification: DeadlineVerification;
  reminderDaysBefore?: number;
};

export const deadlines: SeedDeadline[] = [
  // ---- עברו (2) ----
  { caseIdx: 1, type: "HEARING", title: "דיון קדם משפט – מזונות", offset: -2, time: "10:00", court: "FAMILY_COURT",
    location: "אולם 4", responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 5, type: "LEGAL_DEADLINE", title: "מועד הגשת תגובה לבקשה", offset: -6,
    sourceDescription: "החלטת בית המשפט מיום ההמצאה", decisionOffset: -20, serviceOffset: -19,
    responsible: "manager", verification: "VERIFIED" },

  // ---- ב-7 הימים הקרובים ----
  { caseIdx: 0, type: "LEGAL_DEADLINE", title: "הגשת תצהיר עדות ראשית", offset: 0,
    sourceDescription: "החלטה מדיון קדם המשפט", decisionOffset: -14, serviceOffset: -13,
    responsible: "manager", verification: "PENDING", reminderDaysBefore: 1 },
  { caseIdx: 6, type: "HEARING", title: "דיון בבקשה זמנית – משמורת", offset: 1, time: "09:30", court: "FAMILY_COURT",
    location: "אולם 2", responsible: "manager", verification: "VERIFIED", reminderDaysBefore: 2 },
  { caseIdx: 3, type: "INTERNAL_TARGET", title: "יעד פנימי: השלמת בדיקת נכסים", offset: 2,
    responsible: "employeeA", verification: "VERIFIED" },
  { caseIdx: 2, type: "HEARING", title: "הערכת גורם מקצועי – פגישה ראשונה", offset: 3, time: "14:00",
    location: "לשכת רווחה, תל אביב", responsible: "manager", verification: "PENDING" },
  { caseIdx: 7, type: "LEGAL_DEADLINE", title: "הגשת סיכומים בערעור", offset: 5,
    sourceDescription: "החלטת בית המשפט המחוזי", decisionOffset: -25, serviceOffset: -24,
    responsible: "manager", verification: "PENDING" },
  { caseIdx: 5, type: "HEARING", title: "דיון בבקשה למזונות זמניים", offset: 6, time: "11:15", court: "FAMILY_COURT",
    location: "אולם 7", responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 8, type: "INTERNAL_TARGET", title: "יעד פנימי: טיוטת הסכם ממון ללקוחה", offset: 7,
    responsible: "employeeB", verification: "VERIFIED" },

  // ---- 8-29 ימים ----
  { caseIdx: 1, type: "HEARING", title: "דיון הוכחות – מזונות", offset: 9, time: "10:30", court: "FAMILY_COURT",
    location: "אולם 4", responsible: "employeeA", verification: "VERIFIED" },
  { caseIdx: 10, type: "LEGAL_DEADLINE", title: "מועד לצו ירושה – התנגדויות", offset: 10,
    sourceDescription: "פרסום ברשומות", responsible: "manager", verification: "PENDING" },
  { caseIdx: 0, type: "INTERNAL_TARGET", title: "יעד פנימי: טיוטת כתב תביעה", offset: 11,
    responsible: "employeeA", verification: "VERIFIED" },
  { caseIdx: 6, type: "LEGAL_DEADLINE", title: "הגשת תשובה לכתב טענות", offset: 13,
    sourceDescription: "החלטה בהמצאת כתב הטענות", decisionOffset: -2, serviceOffset: -1,
    responsible: "manager", verification: "PENDING" },
  { caseIdx: 7, type: "HEARING", title: "קדם ערעור", offset: 15, time: "13:00", court: "DISTRICT_COURT",
    location: "אולם 11", responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 11, type: "INTERNAL_TARGET", title: "יעד פנימי: פגישת היכרות", offset: 17,
    responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 2, type: "LEGAL_DEADLINE", title: "הגשת עמדה בנוגע להערכה המקצועית", offset: 20,
    sourceDescription: "החלטה מהדיון האחרון", responsible: "manager", verification: "PENDING" },
  { caseIdx: 10, type: "HEARING", title: "דיון בבקשה לצו ירושה", offset: 23, time: "09:00", court: "FAMILY_COURT",
    location: "אולם 3", responsible: "employeeB", verification: "PENDING" },
  { caseIdx: 14, type: "HEARING", title: "דיון באפוטרופסות", offset: 26, time: "12:00", court: "FAMILY_COURT",
    location: "אולם 5", responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 3, type: "HEARING", title: "דיון קדם משפט – איזון משאבים", offset: 29, time: "10:00", court: "FAMILY_COURT",
    location: "אולם 6", responsible: "manager", verification: "VERIFIED" },
  { caseIdx: 12, type: "INTERNAL_TARGET", title: "יעד פנימי: הגשת תביעה לחלוקת פנסיה", offset: 28,
    responsible: "manager", verification: "PENDING" },
];
