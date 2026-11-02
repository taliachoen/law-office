import type { SessionUser } from "@/server/auth/session-user";
import { getActiveOptions, getLabelMap } from "@/server/services/lookups";
import { listAssignableUsers } from "@/server/services/users";
import type { Option } from "./case-dialogs";

/**
 * אפשרויות לטופס התיק (מנהלת בלבד). בעריכה, ערך נוכחי שכבר כובה ברשימה
 * נשאר זמין (עם סימון), כדי שפתיחת הטופס לא תשנה אותו בשקט.
 */
export async function loadCaseFormOptions(user: SessionUser, current?: { caseType?: string; court?: string | null }) {
  const [types, courts, users, label] = await Promise.all([
    getActiveOptions(user, "CASE_TYPE"),
    getActiveOptions(user, "COURT"),
    listAssignableUsers(user),
    getLabelMap(user, "CASE_TYPE"),
  ]);
  const courtLabel = await getLabelMap(user, "COURT");

  const caseTypes: Option[] = types.map((t) => ({ value: t.code, label: t.label }));
  if (current?.caseType && !caseTypes.some((o) => o.value === current.caseType)) {
    caseTypes.push({ value: current.caseType, label: `${label(current.caseType)} (לא פעיל)` });
  }
  const courtOptions: Option[] = courts.map((c) => ({ value: c.code, label: c.label }));
  if (current?.court && !courtOptions.some((o) => o.value === current.court)) {
    courtOptions.push({ value: current.court, label: `${courtLabel(current.court)} (לא פעיל)` });
  }
  return {
    caseTypes,
    courts: courtOptions,
    users: users.map((u) => ({ value: u.id, label: u.name })),
    employees: users.filter((u) => u.role === "EMPLOYEE").map((u) => ({ value: u.id, label: u.name })),
  };
}
