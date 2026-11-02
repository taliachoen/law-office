import { cases } from "./cases";
import { clients } from "./clients";
import type { UserKey } from "./users";

// 30 מיילי דמה. מייל "מוצע לשיוך" הוא מייל שהשולח או הנמען שלו תואם למייל של הלקוח
// או של עו"ד הצד שכנגד, או שהנושא מכיל את מספר ההליך (סעיף 8 במפרט).
// linkedCaseIdx מסמן מיילים שכבר שויכו לתיק; השאר יופיעו כ"מוצעים".
export type SeedEmail = {
  mailbox: UserKey;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedDaysAgo: number;
  hasAttachment: boolean;
  linkedCaseIdx?: number;
};

const OFFICE_EMAIL = "office@demo.example.test";

const mail = (e: Omit<SeedEmail, "snippet"> & { snippet?: string }): SeedEmail => ({
  ...e,
  snippet: e.snippet ?? e.body.slice(0, 80),
});

// 12 מיילים מלקוחות (לקוח i שייך לתיק i). הראשונים 6 כבר שויכו, 6 האחרים מוצעים.
const clientSubjects = [
  "שאלה לגבי המסמכים שביקשתם",
  "עדכון בעניין הילדים",
  "אישור לפגישה ביום ראשון",
  "מצורפים תלושי השכר",
  "מתי הדיון הבא?",
  "בקשה לעדכון סטטוס",
  "מסמך חדש מהבנק",
  "שאלה על שכר הטרחה",
  "תודה על הפגישה",
  "בקשה להקדים פגישה",
  "מסמכים נוספים מהחברה",
  "ביטול פגישה ותיאום מחדש",
];

const fromClients: SeedEmail[] = clients.map((client, i) =>
  mail({
    mailbox: "manager",
    fromName: client.fullName,
    fromEmail: client.email,
    toEmail: OFFICE_EMAIL,
    subject: clientSubjects[i]!,
    body: `שלום, ${clientSubjects[i]}. אשמח לתשובה בהקדם. תודה, ${client.fullName}. (מייל דמה)`,
    receivedDaysAgo: i + 1,
    hasAttachment: i % 3 === 0,
    linkedCaseIdx: i < 6 ? i : undefined,
  }),
);

// 4 מיילים מעורכי דין של הצד שכנגד (תיקים 0, 1, 2, 5), לא משויכים
const fromOpposing: SeedEmail[] = [0, 1, 2, 5].map((caseIdx, i) => {
  const c = cases[caseIdx]!;
  return mail({
    mailbox: i % 2 === 0 ? "manager" : "employeeA",
    fromName: c.opposingCounsel!,
    fromEmail: c.opposingCounselEmail!,
    toEmail: OFFICE_EMAIL,
    subject: `הצעה להסדר – ${c.title}`,
    body: `בהמשך לשיחתנו, מצורפת הצעת הצד שכנגד להסדר. נבקש התייחסות. (מייל דמה)`,
    receivedDaysAgo: i * 2,
    hasAttachment: true,
  });
});

// 4 מיילים מבית המשפט, שהנושא בהם מכיל מספר הליך (תיקים 0, 1, 6, 7), לא משויכים
const fromCourt: SeedEmail[] = [0, 1, 6, 7].map((caseIdx, i) => {
  const c = cases[caseIdx]!;
  return mail({
    mailbox: "manager",
    fromName: "מזכירות בית המשפט (דמה)",
    fromEmail: "secretary@court.example.test",
    toEmail: OFFICE_EMAIL,
    subject: `הודעה בתיק ${c.courtCaseNumber}`,
    body: `הודעה אוטומטית: נקבע מועד חדש בתיק ${c.courtCaseNumber}. (מייל דמה)`,
    receivedDaysAgo: i + 2,
    hasAttachment: false,
  });
});

// 10 מיילים שלא קשורים לאף תיק
const noise: SeedEmail[] = [
  ["ניוזלטר לשכת עורכי הדין (דמה)", "news@bar.example.test", "ניוזלטר חודשי: עדכוני חקיקה"],
  ["ספק ציוד משרדי", "sales@supplies.example.test", "הצעת מחיר לנייר ולטונר"],
  ["הנהלת חשבונות", "books@accounting.example.test", "דוח חודשי לחתימה"],
  ["קורס השתלמות", "info@training.example.test", "הזמנה להשתלמות בדיני משפחה"],
  ["ספק תוכנה", "support@software.example.test", "עדכון גרסה מתוכנן"],
  ["חברת ניקיון", "office@cleaning.example.test", "אישור מועד ניקיון"],
  ["בעל הנכס (דמה)", "landlord@property.example.test", "תזכורת לגבי חוזה השכירות"],
  ["קפה ומשרד", "orders@coffee.example.test", "אישור הזמנה"],
  ["כנס משפטי", "events@conference.example.test", "הרשמה לכנס השנתי"],
  ["מכרה (דמה)", "friend@personal.example.test", "נתראה בארוחת צהריים?"],
].map(([fromName, fromEmail, subject], i) =>
  mail({
    mailbox: i % 3 === 0 ? "employeeB" : "manager",
    fromName: fromName!,
    fromEmail: fromEmail!,
    toEmail: OFFICE_EMAIL,
    subject: subject!,
    body: `${subject}. (מייל דמה שאינו קשור לאף תיק)`,
    receivedDaysAgo: i + 1,
    hasAttachment: false,
  }),
);

export const emails: SeedEmail[] = [...fromClients, ...fromOpposing, ...fromCourt, ...noise];
