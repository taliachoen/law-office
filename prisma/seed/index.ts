import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../src/generated/prisma/client";
import { writeAudit } from "../../src/server/audit";
import { addDays, todayIso } from "../../src/shared/dates";
import type { TaskEventType } from "../../src/shared/constants";
import { cases, dropboxPathFor } from "./data/cases";
import { clients } from "./data/clients";
import { deadlines } from "./data/deadlines";
import { emails } from "./data/emails";
import { inboxItems } from "./data/inbox";
import { tasks } from "./data/tasks";
import { ORG_NAME, users, type UserKey } from "./data/users";

// נקודת הכניסה של ה-seed. כל נתוני הדמה נכנסים בטרנזקציה אחת:
// אם משהו נכשל, המסד נשאר ריק ולא חצי-מלא.
// בלי קבצים בשלב 1 (קבצי PDF/DOCX יתווספו בשלב 4).
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env["DATABASE_URL"] ?? "file:./prisma/dev.db" }),
});

const today = todayIso();
const DAY_MS = 24 * 60 * 60 * 1000;
/** רגע בזמן לפני n ימים (n יכול להיות שבר) */
const ago = (days: number) => new Date(Date.now() - days * DAY_MS);

async function main() {
  if ((await prisma.organization.count()) > 0) {
    throw new Error("המסד כבר מכיל נתונים. להתחלה נקייה הריצו: npm run db:reset");
  }

  await prisma.$transaction(
    async (tx) => {
      // ---- ארגון ומשתמשים ----
      const org = await tx.organization.create({ data: { name: ORG_NAME } });
      const orgId = org.id;

      const userId = {} as Record<UserKey, string>;
      for (const u of users) {
        const created = await tx.user.create({
          data: { orgId, name: u.name, email: u.email, role: u.role },
        });
        userId[u.key] = created.id;
      }
      const manager = userId.manager;

      // ---- לקוחות ואנשי קשר ----
      const clientIds: string[] = [];
      for (const c of clients) {
        const { contacts, ...fields } = c;
        const created = await tx.client.create({
          data: { orgId, ...fields, contacts: { create: contacts.map((ct) => ({ orgId, ...ct })) } },
        });
        clientIds.push(created.id);
        await writeAudit(tx, {
          orgId, actorId: manager, entityType: "Client", entityId: created.id,
          action: "CREATE", summary: `נוצר לקוח: ${c.fullName}`,
        });
      }

      // ---- תיקים וחברי תיק ----
      const caseIds: string[] = [];
      for (const c of cases) {
        const created = await tx.case.create({
          data: {
            orgId,
            clientId: clientIds[c.clientIdx]!,
            title: c.title,
            internalNumber: c.internalNumber,
            courtCaseNumber: c.courtCaseNumber,
            caseType: c.caseType,
            court: c.court,
            opposingParty: c.opposingParty,
            opposingCounsel: c.opposingCounsel,
            responsibleUserId: userId[c.responsible],
            status: c.status,
            summary: c.summary,
            nextAction: c.nextAction,
            dropboxFolderPath: dropboxPathFor(c.internalNumber),
            members: { create: c.members.map((m) => ({ orgId, userId: userId[m] })) },
          },
        });
        caseIds.push(created.id);
        await writeAudit(tx, {
          orgId, actorId: manager, entityType: "Case", entityId: created.id, caseId: created.id,
          action: "CREATE", summary: `נפתח תיק: ${c.title}`,
        });
      }

      // ---- משימות ואירועי משימה ----
      for (const t of tasks) {
        const theCase = cases[t.caseIdx]!;
        const caseId = caseIds[t.caseIdx]!;

        // עקביות הנתונים: משימה מוקצית רק לעובד שחבר בתיק, וסטטוס ASSIGNED מחייב עובד
        if (t.assignee && !theCase.members.includes(t.assignee)) {
          throw new Error(`משימה "${t.title}": ${t.assignee} אינו חבר בתיק "${theCase.title}"`);
        }
        if (t.status !== "OPEN" && t.status !== "COMPLETED" && !t.assignee) {
          throw new Error(`משימה "${t.title}": סטטוס ${t.status} דורש עובד מוקצה`);
        }

        const created = await tx.task.create({
          data: {
            orgId, caseId,
            title: t.title,
            instructions: t.instructions,
            priority: t.priority,
            status: t.status,
            assigneeId: t.assignee ? userId[t.assignee] : null,
            createdById: manager,
            dueDate: t.dueOffset === undefined ? null : addDays(today, t.dueOffset),
            completionSummary: t.status === "COMPLETED" ? t.summary : null,
            createdAt: ago(t.createdDaysAgo),
          },
        });

        // ציר הזמן נגזר מהסטטוס הנוכחי
        const events: { type: TaskEventType; actor: UserKey; note?: string }[] = [
          { type: "CREATED", actor: "manager" },
        ];
        if (t.assignee && t.status !== "OPEN") events.push({ type: "ASSIGNED", actor: "manager" });
        if (t.assignee && ["IN_REVIEW", "CHANGES_REQUESTED", "COMPLETED"].includes(t.status)) {
          events.push({ type: "SUBMITTED_FOR_REVIEW", actor: t.assignee, note: t.submitNote });
        }
        if (t.status === "CHANGES_REQUESTED") {
          events.push({ type: "CHANGES_REQUESTED", actor: "manager", note: t.returnNote });
        }
        if (t.status === "COMPLETED") {
          events.push({ type: "COMPLETED", actor: "manager", note: t.summary });
        }
        for (const [k, ev] of events.entries()) {
          await tx.taskEvent.create({
            data: {
              orgId, taskId: created.id, actorId: userId[ev.actor], type: ev.type, note: ev.note,
              // האירועים מפוזרים לאורך הזמן, מהיצירה ועד לפני הזמן הנוכחי
              createdAt: ago(t.createdDaysAgo * (1 - k / events.length)),
            },
          });
        }
        await writeAudit(tx, {
          orgId, actorId: manager, entityType: "Task", entityId: created.id, caseId,
          action: "CREATE", summary: `נוצרה משימה: ${t.title}`,
        });
      }

      // ---- חומר חדש ----
      for (const item of inboxItems) {
        const caseId = item.caseIdx === null ? null : caseIds[item.caseIdx]!;
        const created = await tx.inboxItem.create({
          data: {
            orgId, caseId,
            kind: item.kind,
            title: item.title,
            note: item.note,
            sourceLink: item.sourceLink,
            urgent: item.urgent,
            createdById: userId[item.createdBy],
            viewedById: item.viewed ? manager : null,
            viewedAt: item.viewed ? ago(Math.max(item.createdDaysAgo - 1, 0)) : null,
            createdAt: ago(item.createdDaysAgo),
          },
        });
        await writeAudit(tx, {
          orgId, actorId: userId[item.createdBy], entityType: "InboxItem", entityId: created.id, caseId,
          action: "CREATE", summary: `נוסף חומר חדש: ${item.title}`,
        });
      }

      // ---- מועדים ----
      for (const [i, d] of deadlines.entries()) {
        const caseId = caseIds[d.caseIdx]!;
        const created = await tx.deadline.create({
          data: {
            orgId, caseId,
            type: d.type,
            title: d.title,
            date: addDays(today, d.offset),
            time: d.time,
            court: d.court,
            location: d.location,
            sourceDescription: d.sourceDescription,
            decisionDate: d.decisionOffset === undefined ? null : addDays(today, d.decisionOffset),
            serviceDate: d.serviceOffset === undefined ? null : addDays(today, d.serviceOffset),
            responsibleUserId: userId[d.responsible],
            verification: d.verification,
            verifiedById: d.verification === "VERIFIED" ? manager : null,
            reminderDaysBefore: d.reminderDaysBefore ?? 3,
            externalCalendarEventId: `mock-seed-${i + 1}`,
          },
        });
        await writeAudit(tx, {
          orgId, actorId: manager, entityType: "Deadline", entityId: created.id, caseId,
          action: "CREATE", summary: `נוצר מועד: ${d.title}`,
        });
      }

      // ---- מיילי דמה ----
      for (const e of emails) {
        await tx.mockEmail.create({
          data: {
            orgId,
            mailboxUserId: userId[e.mailbox],
            fromName: e.fromName,
            fromEmail: e.fromEmail,
            toEmail: e.toEmail,
            subject: e.subject,
            snippet: e.snippet,
            body: e.body,
            receivedAt: ago(e.receivedDaysAgo),
            hasAttachment: e.hasAttachment,
            linkedCaseId: e.linkedCaseIdx === undefined ? null : caseIds[e.linkedCaseIdx]!,
          },
        });
      }

      // ---- חיבורים (כולם "לא מוגדר" בהתחלה) ----
      for (const provider of ["GMAIL", "CALENDAR", "DROPBOX"]) {
        await tx.integrationConnection.create({ data: { orgId, provider, status: "NOT_CONFIGURED" } });
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  console.log(
    `seed הושלם: ${users.length} משתמשים, ${clients.length} לקוחות, ${cases.length} תיקים, ` +
      `${tasks.length} משימות, ${inboxItems.length} חומר חדש, ${deadlines.length} מועדים, ${emails.length} מיילים`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
