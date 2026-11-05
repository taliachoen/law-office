import type { ClientType } from "../../../src/shared/constants";

// 12 לקוחות דמה. התיקים מפנים אליהם לפי האינדקס במערך (clientIdx).
// כל הפרטים בדויים: ת"ז מתחילה ב-999, טלפונים 050-000xxxx, מיילים בדומיין example.test.
export type SeedContact = { name: string; relation: string; phone?: string; email?: string };

export type SeedClient = {
  type: ClientType;
  fullName: string;
  idNumber?: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  contacts: SeedContact[];
};

// סטטוס קשר לפי אינדקס הלקוח. מי שלא מופיע כאן: ACTIVE (ברירת המחדל).
// לקוחות 4 ו-9 הם של תיקים סגורים.
export const clientContactStatus: Record<number, "AWAITING_CLIENT" | "UNAVAILABLE" | "TREATMENT_ENDED"> = {
  1: "AWAITING_CLIENT",
  4: "TREATMENT_ENDED",
  5: "AWAITING_CLIENT",
  7: "UNAVAILABLE",
  8: "AWAITING_CLIENT",
  9: "TREATMENT_ENDED",
};

export const clients: SeedClient[] = [
  {
    type: "PERSON", fullName: "דנה לביא", idNumber: "999000001", phone: "050-0000001",
    email: "dana.lavi@client.example.test", address: "רחוב הדמה 1, תל אביב",
    notes: "מעדיפה שיחות בשעות הבוקר.",
    contacts: [{ name: "רונית לביא", relation: "אחות", phone: "050-0001001" }],
  },
  {
    type: "PERSON", fullName: "יוסי מזרחי", idNumber: "999000002", phone: "050-0000002",
    email: "yossi.mizrahi@client.example.test", address: "רחוב הדוגמה 5, חיפה",
    contacts: [{ name: "עו\"ד נועם פרידמן", relation: "עו\"ד קודם", email: "noam@lawyer-prev.example.test" }],
  },
  {
    type: "PERSON", fullName: "מיכל אברהמי", idNumber: "999000003", phone: "050-0000003",
    email: "michal.avrahami@client.example.test", address: "שדרות הניסיון 12, ירושלים",
    notes: "לקוחה רגישה לנושא הילדים; לתאם מראש כל שיחה.",
    contacts: [{ name: "אמה אברהמי", relation: "אמא", phone: "050-0001003" }],
  },
  {
    type: "PERSON", fullName: "אורי כץ", idNumber: "999000004", phone: "050-0000004",
    email: "ori.katz@client.example.test", address: "רחוב הבדיקה 7, באר שבע",
    contacts: [],
  },
  {
    type: "PERSON", fullName: "שרון פרידמן", idNumber: "999000005", phone: "050-0000005",
    email: "sharon.friedman@client.example.test", address: "רחוב הדמיון 3, רעננה",
    contacts: [{ name: "גיא פרידמן", relation: "אח", phone: "050-0001005", email: "guy.f@client.example.test" }],
  },
  {
    type: "PERSON", fullName: "אבי שמעוני", idNumber: "999000006", phone: "050-0000006",
    email: "avi.shimoni@client.example.test", address: "רחוב הדמה 22, פתח תקווה",
    notes: "עובד במשמרות; ליצור קשר בהודעה כתובה.",
    contacts: [],
  },
  {
    type: "PERSON", fullName: "תמר בן דוד", idNumber: "999000007", phone: "050-0000007",
    email: "tamar.bendavid@client.example.test", address: "רחוב הניסוי 9, נתניה",
    contacts: [{ name: "שלמה בן דוד", relation: "אבא", phone: "050-0001007" }],
  },
  {
    type: "PERSON", fullName: "עומר גולן", idNumber: "999000008", phone: "050-0000008",
    email: "omer.golan@client.example.test", address: "רחוב הדוגמה 30, חולון",
    contacts: [],
  },
  {
    type: "PERSON", fullName: "ליאת חזן", idNumber: "999000009", phone: "050-0000009",
    email: "liat.hazan@client.example.test", address: "רחוב הבדיקה 14, אשדוד",
    contacts: [{ name: "דורית חזן", relation: "אחות", phone: "050-0001009" }],
  },
  {
    type: "PERSON", fullName: "נועה רוזן", idNumber: "999000010", phone: "050-0000010",
    email: "noa.rosen@client.example.test", address: "רחוב הדמה 8, הרצליה",
    contacts: [],
  },
  {
    type: "COMPANY", fullName: "דמה השקעות בע\"מ", idNumber: "519999991", phone: "03-5000011",
    email: "office@demo-invest.example.test", address: "מגדל הדמה, רמת גן",
    notes: "חברה משפחתית; נושא אפוטרופסות על נכס מניב של אחד הבעלים.",
    contacts: [{ name: "הילה דמה", relation: "מנהלת כספים", phone: "03-5000012", email: "hila@demo-invest.example.test" }],
  },
  {
    type: "PERSON", fullName: "רונן אשכנזי", idNumber: "999000012", phone: "050-0000012",
    email: "ronen.ashkenazi@client.example.test", address: "רחוב הניסוי 2, כפר סבא",
    contacts: [{ name: "עו\"ד ליאור שמש", relation: "עו\"ד קודם", email: "lior@lawyer-prev.example.test" }],
  },
];
