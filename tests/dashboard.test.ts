import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { getDashboardCounts } from "@/server/services/dashboard";
import type { SessionUser } from "@/server/auth/session-user";
import { addDays, todayIso } from "@/shared/dates";

// בדיקות מול מסד SQLite אמיתי (tests/.tmp/test.db, נוצר מחדש ב-global-setup).
// כל בדיקה עובדת בארגון משלה, ולכן אינה תלויה בנתונים אחרים.
const orgId = "test-org-dashboard";
let manager: SessionUser;
let empA: SessionUser;
let empB: SessionUser;

beforeAll(async () => {
  const mk = (name: string, role: "MANAGER" | "EMPLOYEE", email: string) =>
    db.user.create({ data: { orgId, name, role, email } });
  const [m, a, b] = await Promise.all([
    mk("מנהלת", "MANAGER", "m@t.test"),
    mk("עובד א", "EMPLOYEE", "a@t.test"),
    mk("עובדת ב", "EMPLOYEE", "b@t.test"),
  ]);
  manager = { id: m.id, orgId, name: m.name, role: "MANAGER" };
  empA = { id: a.id, orgId, name: a.name, role: "EMPLOYEE" };
  empB = { id: b.id, orgId, name: b.name, role: "EMPLOYEE" };

  const client1 = await db.client.create({ data: { orgId, type: "PERSON", fullName: "לקוח 1" } });
  const client2 = await db.client.create({ data: { orgId, type: "PERSON", fullName: "לקוח 2" } });
  const mkCase = (clientId: string, n: string, memberId: string) =>
    db.case.create({
      data: {
        orgId, clientId, title: `תיק ${n}`, internalNumber: n, caseType: "DIVORCE",
        responsibleUserId: manager.id, status: "ACTIVE",
        members: { create: [{ orgId, userId: memberId }] },
      },
    });
  const caseA = await mkCase(client1.id, "T-1", empA.id);
  const caseB = await mkCase(client2.id, "T-2", empB.id);

  const today = todayIso();
  const mkTask = (caseId: string, status: string, dueDate: string, assigneeId?: string) =>
    db.task.create({
      data: { orgId, caseId, title: "משימה", priority: "NORMAL", status, dueDate, assigneeId, createdById: manager.id },
    });
  await mkTask(caseA.id, "ASSIGNED", addDays(today, -3), empA.id); // באיחור, של א'
  await mkTask(caseA.id, "CHANGES_REQUESTED", addDays(today, 2), empA.id);
  await mkTask(caseB.id, "IN_REVIEW", addDays(today, 5), empB.id);
  await mkTask(caseB.id, "COMPLETED", addDays(today, -9), empB.id); // לא נספרת כפתוחה

  await db.inboxItem.create({ data: { orgId, caseId: caseA.id, kind: "LETTER", title: "א", createdById: manager.id } });
  await db.inboxItem.create({ data: { orgId, caseId: caseB.id, kind: "LETTER", title: "ב", createdById: manager.id } });
  await db.inboxItem.create({ data: { orgId, caseId: null, kind: "OTHER", title: "לשיוך של א", createdById: empA.id } });
  await db.deadline.create({
    data: { orgId, caseId: caseB.id, type: "HEARING", title: "דיון", date: addDays(today, 3), responsibleUserId: manager.id },
  });
});

describe("getDashboardCounts", () => {
  it("מנהלת רואה את כל הארגון", async () => {
    const c = await getDashboardCounts(manager);
    expect(c).toMatchObject({
      clients: 2, activeCases: 2, openTasks: 3, overdueTasks: 1, unseenInbox: 3, upcomingDeadlines: 1,
      reviewCard: { label: "ממתינות לבדיקה", count: 1 },
    });
  });

  it("עובד א' רואה רק את התיק שלו ואת החומר שהוסיף בעצמו", async () => {
    const c = await getDashboardCounts(empA);
    expect(c).toMatchObject({
      clients: 1, activeCases: 1, openTasks: 2, overdueTasks: 1,
      unseenInbox: 2, // פריט בתיק שלו + פריט "לשיוך" שהוא הוסיף
      upcomingDeadlines: 0, // המועד שייך לתיק של ב'
      reviewCard: { label: "הוחזרו אליי לתיקון", count: 1 },
    });
  });

  it("עובדת ב' לא רואה דבר מהתיק של א'", async () => {
    const c = await getDashboardCounts(empB);
    expect(c).toMatchObject({
      clients: 1, activeCases: 1, openTasks: 1, overdueTasks: 0,
      unseenInbox: 1, upcomingDeadlines: 1,
      reviewCard: { count: 0 },
    });
  });

  it("רשומה שנמחקה (deletedAt) לא נספרת", async () => {
    const other = "test-org-deleted";
    const u = await db.user.create({ data: { orgId: other, name: "מ", role: "MANAGER", email: "d@t.test" } });
    await db.client.create({ data: { orgId: other, type: "PERSON", fullName: "פעיל" } });
    await db.client.create({ data: { orgId: other, type: "PERSON", fullName: "נמחק", deletedAt: new Date() } });
    const c = await getDashboardCounts({ id: u.id, orgId: other, name: "מ", role: "MANAGER" });
    expect(c.clients).toBe(1);
  });
});

describe("writeAudit", () => {
  const base = { orgId, actorId: "x", entityType: "Test", action: "CREATE", summary: "בדיקה" };

  it("נשמר יחד עם השינוי כשהטרנזקציה מצליחה", async () => {
    await db.$transaction(async (tx) => {
      await writeAudit(tx, { ...base, entityId: "ok-1" });
    });
    expect(await db.auditEvent.count({ where: { entityId: "ok-1" } })).toBe(1);
  });

  it("מתבטל יחד עם השינוי כשהטרנזקציה נכשלת", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await writeAudit(tx, { ...base, entityId: "rolled-back" });
        throw new Error("כישלון מכוון");
      }),
    ).rejects.toThrow("כישלון מכוון");
    expect(await db.auditEvent.count({ where: { entityId: "rolled-back" } })).toBe(0);
  });
});
