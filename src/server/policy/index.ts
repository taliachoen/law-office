import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/auth/session-user";
import { ForbiddenError } from "@/server/errors";

// שכבת ההרשאות. הפונקציות כאן טהורות: אין גישה למסד.
// השירות הוא שטוען את הנתונים (למשל חברי התיק) ומעביר אותם בתוך `resource`.
// לרשימות (שאין להן "משאב" יחיד) יש בונים של תנאי Prisma: caseScope, clientScope, inboxScope.

export const ACTIONS = [
  // מנהלת בלבד
  "client:write",
  "case:write",
  "case:assign-members",
  "task:create",
  "task:assign",
  "task:review", // החזרה לתיקון, סיום, פתיחה מחדש
  "task:delete",
  "inbox:mark-viewed",
  "inbox:delete",
  "document:delete",
  "deadline:verify",
  "trash:view",
  "trash:restore",
  "settings:manage",
  // עובד: רק בתיקים שהוא חבר בהם
  "client:read",
  "case:read",
  "task:read",
  "document:read",
  "document:upload",
  "inbox:read",
  "inbox:add",
  "deadline:read",
  "deadline:write",
  // עובד: רק משימה שהוקצתה לו
  "task:submit",
] as const;
export type Action = (typeof ACTIONS)[number];

/** המידע על המשאב שההחלטה צריכה. את כולו טוען השירות. */
export type ResourceContext = {
  orgId: string;
  /** מזהי העובדים החברים בתיק (או, ללקוח: בכל התיקים שלו). */
  memberUserIds?: readonly string[];
  /** למשימה: מי שהוקצתה לו. */
  assigneeId?: string | null;
  /** לפריט חומר חדש בלי תיק ("לשיוך"): מי הוסיף אותו. */
  createdById?: string | null;
  /** true כשהפעולה היא על חומר חדש שעדיין לא שויך לתיק. */
  caseless?: boolean;
};

const MANAGER_ONLY: ReadonlySet<Action> = new Set<Action>([
  "client:write",
  "case:write",
  "case:assign-members",
  "task:create",
  "task:assign",
  "task:review",
  "task:delete",
  "inbox:mark-viewed",
  "inbox:delete",
  "document:delete",
  "deadline:verify",
  "trash:view",
  "trash:restore",
  "settings:manage",
]);

const MEMBER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "client:read",
  "case:read",
  "task:read",
  "document:read",
  "document:upload",
  "inbox:read",
  "inbox:add",
  "deadline:read",
  "deadline:write",
]);

export function can(user: SessionUser, action: Action, resource: ResourceContext): boolean {
  // גבול הארגון קודם לכל כלל אחר
  if (user.orgId !== resource.orgId) return false;
  if (user.role === "MANAGER") return true;

  // עובד
  if (MANAGER_ONLY.has(action)) return false;

  if (action === "task:submit") return resource.assigneeId === user.id;

  if (MEMBER_ACTIONS.has(action)) {
    // חומר חדש שלא שויך לתיק: אפשר להוסיף, ולראות רק את מה שהוספת בעצמך
    if (resource.caseless) {
      if (action === "inbox:add") return true;
      if (action === "inbox:read") return resource.createdById === user.id;
      return false;
    }
    return resource.memberUserIds?.includes(user.id) ?? false;
  }

  return false;
}

/** כמו can, אבל זורק שגיאת "אין הרשאה". כך השירותים לא יכולים "לשכוח" לבדוק. */
export function authorize(user: SessionUser, action: Action, resource: ResourceContext): void {
  if (!can(user, action, resource)) throw new ForbiddenError();
}

// ---- תנאי סינון לרשימות ----

/** אילו תיקים המשתמש רואה. עובד: רק תיקים שהוא חבר בהם. */
export function caseScope(user: SessionUser): Prisma.CaseWhereInput {
  const base: Prisma.CaseWhereInput = { orgId: user.orgId, deletedAt: null };
  if (user.role === "MANAGER") return base;
  return { ...base, members: { some: { userId: user.id } } };
}

/** אילו לקוחות המשתמש רואה. עובד: רק לקוחות שיש להם תיק שהוא חבר בו. */
export function clientScope(user: SessionUser): Prisma.ClientWhereInput {
  const base: Prisma.ClientWhereInput = { orgId: user.orgId, deletedAt: null };
  if (user.role === "MANAGER") return base;
  return { ...base, cases: { some: caseScope(user) } };
}

/** חומר חדש: מנהלת הכול; עובד את מה שבתיקים שלו ואת מה שהוסיף בעצמו בלי תיק. */
export function inboxScope(user: SessionUser): Prisma.InboxItemWhereInput {
  const base: Prisma.InboxItemWhereInput = { orgId: user.orgId, deletedAt: null };
  if (user.role === "MANAGER") return base;
  return {
    ...base,
    OR: [{ case: caseScope(user) }, { caseId: null, createdById: user.id }],
  };
}
