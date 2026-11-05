import type { LookupList } from "./constants";

// ערכי ברירת מחדל של דיני משפחה לרשימות ההגדרה. משמשים את ה-seed, ובעתיד את יצירת ארגון חדש.
// code הוא מזהה יציב שנשמר ברשומות העסקיות; label הוא מה שמוצג וניתן לשינוי לכל ארגון.
// הסדר במערך הוא ה-sortOrder ההתחלתי.
export const DEFAULT_LOOKUPS = {
  CASE_TYPE: [
    { code: "DIVORCE", label: "גירושין" },
    { code: "ALIMONY", label: "מזונות" },
    { code: "CUSTODY", label: "משמורת וזמני שהות" },
    { code: "PROPERTY_BALANCE", label: "רכוש ואיזון משאבים" },
    { code: "PRENUP", label: "הסכם ממון" },
    { code: "WILLS_INHERITANCE", label: "צוואות וירושות" },
    { code: "GUARDIANSHIP", label: "אפוטרופסות" },
    { code: "OTHER", label: "אחר" },
  ],
  COURT: [
    { code: "FAMILY_COURT", label: "בית משפט לענייני משפחה" },
    { code: "RABBINICAL_COURT", label: "בית הדין הרבני" },
    { code: "DISTRICT_COURT", label: "בית משפט מחוזי" },
    { code: "SUPREME_COURT", label: "בית המשפט העליון" },
    { code: "OTHER", label: "אחר" },
  ],
  INBOX_KIND: [
    { code: "COURT_DECISION", label: "החלטת בית משפט" },
    { code: "OPPOSING_PLEADING", label: "כתב טענות של צד שכנגד" },
    { code: "CLIENT_DOCUMENT", label: "מסמך מהלקוח" },
    { code: "LETTER", label: "מכתב" },
    { code: "OTHER", label: "אחר" },
  ],
  CONTACT_STATUS: [
    { code: "ACTIVE", label: "פעיל" },
    { code: "AWAITING_CLIENT", label: "ממתין לתגובת הלקוח" },
    { code: "UNAVAILABLE", label: "לא זמין" },
    { code: "TREATMENT_ENDED", label: "הסתיים הטיפול" },
  ],
} as const satisfies Record<LookupList, readonly { code: string; label: string }[]>;

/** קודי ברירת המחדל של רשימה, לטיפוס בטוח בקבצי ה-seed. */
export type DefaultCode<L extends LookupList> = (typeof DEFAULT_LOOKUPS)[L][number]["code"];
