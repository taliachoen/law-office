import type { Role } from "../../../src/shared/constants";

// נתוני דמה בלבד. המפתח (key) משמש את שאר קבצי ה-seed כדי להפנות למשתמש.
export const ORG_NAME = "משרד דמה – דיני משפחה";

export type UserKey = "manager" | "employeeA" | "employeeB" | "secretary";

export const users: { key: UserKey; name: string; email: string; role: Role }[] = [
  { key: "manager", name: "עו\"ד דמה – מנהלת", email: "manager@demo.example.test", role: "MANAGER" },
  { key: "employeeA", name: "עובד דמה א'", email: "employee-a@demo.example.test", role: "EMPLOYEE" },
  { key: "employeeB", name: "עובדת דמה ב'", email: "employee-b@demo.example.test", role: "EMPLOYEE" },
  { key: "secretary", name: "מזכירה דמה", email: "secretary@demo.example.test", role: "SECRETARY" },
];
