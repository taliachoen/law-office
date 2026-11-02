import type { TaskEventType, TaskStatus } from "./constants";
import { TASK_STATUSES } from "./constants";

// מכונת המצבים של משימה (סעיף 7 במפרט), כפונקציות טהורות.
// השירות משתמש בה לאכיפה, והממשק להצגת כפתורים לפי מצב ותפקיד: מקור אחד, בלי סטייה ביניהם.

export const TASK_COMMANDS = ["ASSIGN", "SUBMIT", "REQUEST_CHANGES", "COMPLETE", "REOPEN", "DELETE"] as const;
export type TaskCommand = (typeof TASK_COMMANDS)[number];

export const TASK_COMMAND_LABELS: Record<TaskCommand, string> = {
  ASSIGN: "העברה לעובד",
  SUBMIT: "הגשה לבדיקה",
  REQUEST_CHANGES: "החזרה לעובד לתיקון",
  COMPLETE: "סיום המשימה",
  REOPEN: "פתיחה מחדש",
  DELETE: "מחיקה",
};

type Rule = {
  from: readonly TaskStatus[];
  /** מנהלת בלבד; אחרת הפעולה היא של העובד המוקצה */
  managerOnly: boolean;
  event: TaskEventType;
  /** הודעת שגיאה כשהטקסט הנלווה חסר; null = אין חובה */
  textRequired: string | null;
};

export const TASK_RULES: Record<TaskCommand, Rule> = {
  ASSIGN: { from: ["OPEN"], managerOnly: true, event: "ASSIGNED", textRequired: null },
  SUBMIT: { from: ["ASSIGNED", "CHANGES_REQUESTED"], managerOnly: false, event: "SUBMITTED_FOR_REVIEW", textRequired: "יש להזין הערת מענה" },
  REQUEST_CHANGES: { from: ["IN_REVIEW"], managerOnly: true, event: "CHANGES_REQUESTED", textRequired: "יש להזין הערת תיקון" },
  COMPLETE: { from: ["IN_REVIEW", "ASSIGNED", "OPEN"], managerOnly: true, event: "COMPLETED", textRequired: "יש להזין סיכום ביצוע" },
  REOPEN: { from: ["COMPLETED"], managerOnly: true, event: "REOPENED", textRequired: "יש להזין סיבה לפתיחה מחדש" },
  DELETE: { from: TASK_STATUSES, managerOnly: true, event: "DELETED", textRequired: null },
};

export function canTransition(command: TaskCommand, status: TaskStatus): boolean {
  return TASK_RULES[command].from.includes(status);
}

/** המצב שאליו המשימה עוברת. DELETE לא משנה מצב (המצב נשמר ב-statusBeforeTrash). */
export function targetStatus(command: TaskCommand, status: TaskStatus, opts: { withAssignee?: boolean } = {}): TaskStatus {
  switch (command) {
    case "ASSIGN": return "ASSIGNED";
    case "SUBMIT": return "IN_REVIEW";
    case "REQUEST_CHANGES": return "CHANGES_REQUESTED";
    case "COMPLETE": return "COMPLETED";
    case "REOPEN": return opts.withAssignee ? "ASSIGNED" : "OPEN";
    case "DELETE": return status;
  }
}

/** אילו כפתורי פעולה להציג למשתמש, לפי מצב המשימה ותפקידו. */
export function availableCommands(status: TaskStatus, actor: { isManager: boolean; isAssignee: boolean }): TaskCommand[] {
  return TASK_COMMANDS.filter((command) => {
    if (!canTransition(command, status)) return false;
    return TASK_RULES[command].managerOnly ? actor.isManager : actor.isAssignee;
  });
}
