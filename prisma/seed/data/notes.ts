import type { UserKey } from "./users";

// 20 תיעודים ב-8 תיקים (מפנים לאינדקס התיק). יוצר שאינו מנהלת חייב להיות חבר בתיק, או מזכירה (רואה את כל המשרד).
export type SeedNote = {
  caseIdx: number;
  kind: "CALL" | "MEETING" | "NOTE";
  /** כמה ימים לפני עכשיו קרה */
  daysAgo: number;
  participants?: string;
  body: string;
  createdBy: UserKey;
};

export const notes: SeedNote[] = [
  { caseIdx: 0, kind: "MEETING", daysAgo: 12, participants: "הלקוחה", body: "פגישת היכרות. סוכמו מטרות הטיפול והמסמכים שיש להביא.", createdBy: "manager" },
  { caseIdx: 0, kind: "CALL", daysAgo: 5, participants: "הלקוחה", body: "הלקוחה אישרה את טיוטת העובדות. ביקשה לדחות את ההגשה בשבוע.", createdBy: "employeeA" },
  { caseIdx: 0, kind: "NOTE", daysAgo: 0.5, body: "נשלחה תזכורת ללקוחה בנוגע לתצהיר המשלים.", createdBy: "secretary" },
  { caseIdx: 1, kind: "CALL", daysAgo: 9, participants: "הלקוח", body: "עדכון על מועד הדיון. הלקוח ביקש לשמוע על חלופת פשרה.", createdBy: "manager" },
  { caseIdx: 1, kind: "MEETING", daysAgo: 4, participants: "הלקוח ואחיו", body: "נדונה הצעת הצד שכנגד. הלקוח שוקל וישיב עד סוף השבוע.", createdBy: "employeeA" },
  { caseIdx: 1, kind: "NOTE", daysAgo: 1, body: "הלקוח טרם השיב. לחזור אליו ביום ראשון.", createdBy: "secretary" },
  { caseIdx: 2, kind: "CALL", daysAgo: 15, participants: "הלקוחה", body: "שיחה על זמני השהות בחגים.", createdBy: "employeeA" },
  { caseIdx: 2, kind: "NOTE", daysAgo: 6, body: "התקבל מכתב מעו\"ד הצד שכנגד. הועבר לטיפול.", createdBy: "manager" },
  { caseIdx: 3, kind: "MEETING", daysAgo: 20, participants: "הלקוח ורואה החשבון", body: "סקירת נכסים וחשבונות. נרשמה רשימת מסמכים חסרים.", createdBy: "manager" },
  { caseIdx: 3, kind: "CALL", daysAgo: 8, participants: "רואה החשבון", body: "רואה החשבון יעביר דוחות עד סוף החודש.", createdBy: "employeeA" },
  { caseIdx: 3, kind: "NOTE", daysAgo: 2, body: "הצד שכנגד טרם השיב לדרישת המסמכים.", createdBy: "employeeA" },
  { caseIdx: 5, kind: "CALL", daysAgo: 7, participants: "הלקוח", body: "עדכון על מצב הבקשה לדחיית הדיון.", createdBy: "employeeB" },
  { caseIdx: 5, kind: "NOTE", daysAgo: 3, body: "הוגשה בקשה לדחיית דיון. ממתינים להחלטה.", createdBy: "manager" },
  { caseIdx: 6, kind: "MEETING", daysAgo: 18, participants: "הלקוחה ובעלה", body: "פגישה משותפת. סוכמו עקרונות להסכם גירושין.", createdBy: "manager" },
  { caseIdx: 6, kind: "CALL", daysAgo: 10, participants: "הלקוחה", body: "הלקוחה ביקשה להוסיף סעיף על החזקת הכלב.", createdBy: "employeeA" },
  { caseIdx: 6, kind: "NOTE", daysAgo: 1.5, body: "טיוטה ראשונה של ההסכם נשלחה לעיון הצדדים.", createdBy: "employeeB" },
  { caseIdx: 7, kind: "CALL", daysAgo: 11, participants: "השמאי", body: "תואם מועד ביקור בנכס.", createdBy: "employeeB" },
  { caseIdx: 7, kind: "NOTE", daysAgo: 4, body: "השמאי דחה את הביקור בשבוע. עדכנתי את הלקוח.", createdBy: "secretary" },
  { caseIdx: 8, kind: "MEETING", daysAgo: 14, participants: "הלקוחה", body: "פגישה לגיבוש עקרונות הסכם הממון.", createdBy: "manager" },
  { caseIdx: 8, kind: "CALL", daysAgo: 2, participants: "הלקוחה", body: "הלקוחה ביקשה הבהרה לגבי סעיף הירושה.", createdBy: "employeeB" },
];
