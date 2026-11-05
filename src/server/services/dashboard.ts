import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { caseScope, clientScope, inboxScope } from "@/server/policy";
import { addDays, todayIso } from "@/shared/dates";

// לוח הבקרה הזמני של שלב 1: ספירות בלבד.
// שימו לב: אין כאן authorize() כי זו קריאה מסוננת. ההרשאה היא ה-scope עצמו
// (עובד פשוט סופר פחות דברים), ולא "מותר/אסור" על משאב בודד.
export async function getDashboardCounts(user: SessionUser) {
  const today = todayIso();
  const in7Days = addDays(today, 7);
  const cases = caseScope(user);

  const taskBase = { orgId: user.orgId, deletedAt: null, case: cases };

  const [clients, activeCases, openTasks, overdueTasks, waitingReview, returnedToMe, unseenInbox, upcomingDeadlines] =
    await Promise.all([
      db.client.count({ where: clientScope(user) }),
      db.case.count({ where: { ...cases, status: "ACTIVE" } }),
      db.task.count({ where: { ...taskBase, status: { not: "COMPLETED" } } }),
      // dueDate הוא YYYY-MM-DD, ולכן השוואת מחרוזות שקולה להשוואת תאריכים
      db.task.count({ where: { ...taskBase, status: { not: "COMPLETED" }, dueDate: { lt: today } } }),
      db.task.count({ where: { ...taskBase, status: "IN_REVIEW" } }),
      db.task.count({ where: { ...taskBase, status: "CHANGES_REQUESTED", assigneeId: user.id } }),
      db.inboxItem.count({ where: { ...inboxScope(user), viewedAt: null } }),
      db.deadline.count({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          done: false,
          date: { gte: today, lte: in7Days },
          case: cases,
        },
      }),
    ]);

  return {
    clients,
    activeCases,
    openTasks,
    overdueTasks,
    // למנהלת: מה מחכה לבדיקה. לעובד: מה הוחזר אליו לתיקון (סעיף 6.1 במפרט)
    reviewCard:
      user.role === "EMPLOYEE"
        ? { label: "הוחזרו אליי לתיקון", count: returnedToMe }
        : { label: "ממתינות לבדיקה", count: waitingReview },
    unseenInbox,
    upcomingDeadlines,
  };
}
