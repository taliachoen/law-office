import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/auth/session-user";
import { ForbiddenError } from "@/server/errors";

// שכבת ההרשאות. הפונקציות כאן טהורות: אין גישה למסד.
// השירות הוא שטוען את הנתונים (למשל חברי התיק) ומעביר אותם בתוך `resource`.
// לרשימות (שאין להן "משאב" יחיד) יש בונים של תנאי Prisma: caseScope, clientScope, inboxScope.
//
// שלושה תפקידים: מנהלת (הכול), עובד (רק תיקים שהוא חבר בהם) ומזכירות (רואה את כל המשרד,
// אבל מבצעת רק חלק מהפעולות; ראו SECRETARY_ACTIONS וסעיף 4 במפרט).

export const ACTIONS = [
  // מנהלת בלבד
  "client:write-delete",
  "case:assign-members",
  "case:edit-blockers",
  "task:create",
  "task:edit",
  "task:assign",
  "task:review", // החזרה לתיקון, סיום, פתיחה מחדש
  "task:delete",
  "task:team-load",
  "inbox:mark-viewed",
  "inbox:delete",
  "document:delete",
  "deadline:verify",
  "note:delete",
  "trash:view",
  "trash:restore",
  "settings:manage",
  // מנהלת ומזכירות
  "client:write",
  "case:write",
  // עובד: רק בתיקים שהוא חבר בהם. מזכירות: בכל המשרד, חוץ ממה שמסומן "בלי מזכירות" למטה
  "client:read",
  "case:read",
  "task:read",
  "document:read",
  "document:upload",
  "inbox:read",
  "inbox:add",
  "deadline:read",
  "deadline:write",
  "note:read",
  "note:create",
  // עריכת תיעוד: היוצר תוך 24 שעות (מנהלת: תמיד)
  "note:edit",
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
  /** לפריט חומר חדש בלי תיק ("לשיוך") או לתיעוד: מי יצר אותו. */
  createdById?: string | null;
  /** לתיעוד: מתי נוצר (לכלל 24 השעות). */
  createdAt?: Date;
  /** true כשהפעולה היא על חומר חדש שעדיין לא שויך לתיק. */
  caseless?: boolean;
};

export const NOTE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const MANAGER_ONLY: ReadonlySet<Action> = new Set<Action>([
  "client:write-delete",
  "case:assign-members",
  "case:edit-blockers",
  "task:create",
  "task:edit",
  "task:assign",
  "task:review",
  "task:delete",
  "task:team-load",
  "inbox:mark-viewed",
  "inbox:delete",
  "document:delete",
  "deadline:verify",
  "note:delete",
  "trash:view",
  "trash:restore",
  "settings:manage",
]);

/** פעולות שמזכירות מבצעת בכל המשרד (סעיף 4 במפרט). כל מה שלא כאן ולא "קריאה" אסור לה. */
const SECRETARY_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "client:read",
  "case:read",
  "task:read", // קריאה בלבד
  "document:read",
  "document:upload",
  "inbox:read",
  "inbox:add",
  "deadline:read",
  "deadline:write",
  "client:write",
  "case:write",
  "note:read",
  "note:create",
  "note:edit",
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
  "note:read",
  "note:create",
  "note:edit",
]);

/** מי רואה את כל המשרד (ולא רק תיקים שהוא חבר בהם). */
export function seesWholeOffice(user: SessionUser): boolean {
  return user.role === "MANAGER" || user.role === "SECRETARY";
}

function canEditNote(user: SessionUser, resource: ResourceContext, now: Date): boolean {
  if (resource.createdById !== user.id || !resource.createdAt) return false;
  return now.getTime() - resource.createdAt.getTime() < NOTE_EDIT_WINDOW_MS;
}

export function can(user: SessionUser, action: Action, resource: ResourceContext, now: Date = new Date()): boolean {
  // גבול הארגון קודם לכל כלל אחר
  if (user.orgId !== resource.orgId) return false;
  if (user.role === "MANAGER") return true;
  if (MANAGER_ONLY.has(action)) return false;

  if (user.role === "SECRETARY") {
    if (!SECRETARY_ACTIONS.has(action)) return false;
    // חומר חדש בלי תיק: מוסיפים, ורואים רק את מה שהוספת בעצמך (כמו עובד)
    if (resource.caseless) {
      if (action === "inbox:add") return true;
      if (action === "inbox:read") return resource.createdById === user.id;
      return false;
    }
    if (action === "note:edit") return canEditNote(user, resource, now);
    return true;
  }

  // עובד
  if (action === "task:submit") return resource.assigneeId === user.id;

  if (MEMBER_ACTIONS.has(action)) {
    // חומר חדש שלא שויך לתיק: אפשר להוסיף, ולראות רק את מה שהוספת בעצמך
    if (resource.caseless) {
      if (action === "inbox:add") return true;
      if (action === "inbox:read") return resource.createdById === user.id;
      return false;
    }
    if (!(resource.memberUserIds?.includes(user.id) ?? false)) return false;
    if (action === "note:edit") return canEditNote(user, resource, now);
    return true;
  }

  return false;
}

/** כמו can, אבל זורק שגיאת "אין הרשאה". כך השירותים לא יכולים "לשכוח" לבדוק. */
export function authorize(user: SessionUser, action: Action, resource: ResourceContext, now?: Date): void {
  if (!can(user, action, resource, now)) throw new ForbiddenError();
}

// ---- תנאי סינון לרשימות ----

/** אילו תיקים המשתמש רואה. עובד: רק תיקים שהוא חבר בהם. מנהלת ומזכירות: כל המשרד. */
export function caseScope(user: SessionUser): Prisma.CaseWhereInput {
  const base: Prisma.CaseWhereInput = { orgId: user.orgId, deletedAt: null };
  if (seesWholeOffice(user)) return base;
  return { ...base, members: { some: { userId: user.id } } };
}

/** אילו לקוחות המשתמש רואה. עובד: רק לקוחות שיש להם תיק שהוא חבר בו. */
export function clientScope(user: SessionUser): Prisma.ClientWhereInput {
  const base: Prisma.ClientWhereInput = { orgId: user.orgId, deletedAt: null };
  if (seesWholeOffice(user)) return base;
  return { ...base, cases: { some: caseScope(user) } };
}

/**
 * חומר חדש: מנהלת הכול. עובד: מה שבתיקים שלו ומה שהוסיף בעצמו בלי תיק.
 * מזכירות: כל מה ששויך לתיק, ובלי תיק רק מה שהוסיפה בעצמה.
 */
export function inboxScope(user: SessionUser): Prisma.InboxItemWhereInput {
  const base: Prisma.InboxItemWhereInput = { orgId: user.orgId, deletedAt: null };
  if (user.role === "MANAGER") return base;
  return {
    ...base,
    OR: [{ case: caseScope(user) }, { caseId: null, createdById: user.id }],
  };
}
