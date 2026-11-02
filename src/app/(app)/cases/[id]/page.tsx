import Link from "next/link";
import { CaseStatusBadge } from "@/components/badges";
import { TaskList } from "@/components/task-list";
import { Forbidden } from "@/components/forbidden";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCaseDetail, getCaseHistory } from "@/server/services/cases";
import { getLabelMap } from "@/server/services/lookups";
import { getTaskFormOptions, listTasks } from "@/server/services/tasks";
import { DEADLINE_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type DeadlineType, type TaskPriority, type TaskStatus } from "@/shared/constants";
import { formatDateHe, formatDateTimeHe } from "@/shared/dates";
import { guard } from "../../guard";
import { TaskFormDialog } from "../../tasks/task-dialogs";
import { CaseFormDialog, MembersDialog } from "../case-dialogs";
import { loadCaseFormOptions } from "../form-options";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

// רק הלשוניות שכבר נבנו מופיעות (מסמכים, מועדים ומיילים יתווספו בשלבים הבאים)
const TABS = [
  { key: "overview", label: "סקירה" },
  { key: "tasks", label: "משימות" },
  { key: "history", label: "היסטוריה" },
] as const;

export default async function CasePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "history" || tab === "tasks" ? tab : "overview";
  const user = await getCurrentUser();
  const isManager = user.role === "MANAGER";

  const result = await guard(() => getCaseDetail(user, id));
  if (result.forbidden) return <Forbidden backHref="/cases" backLabel="חזרה לתיקים" />;
  const { case: c, openTasks, nextDeadline } = result.data;

  const [typeLabel, courtLabel, options] = await Promise.all([
    getLabelMap(user, "CASE_TYPE"),
    getLabelMap(user, "COURT"),
    isManager ? loadCaseFormOptions(user, { caseType: c.caseType, court: c.court }) : null,
  ]);
  const history = activeTab === "history" ? await getCaseHistory(user, id) : [];
  const caseTasks = activeTab === "tasks" ? await listTasks(user, { caseId: id }) : [];
  // טופס משימה חדשה בתוך התיק: רק התיק הנוכחי, ורק אם הוא לא סגור
  const taskFormCases = activeTab === "tasks" && isManager ? (await getTaskFormOptions(user)).filter((o) => o.id === id) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cases" className="text-sm text-navy-700 hover:underline">← כל התיקים</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">{c.title}</h1>
            <CaseStatusBadge status={c.status} />
          </div>
          {options && (
            <CaseFormDialog caseTypes={options.caseTypes} courts={options.courts} users={options.users} values={c} />
          )}
        </div>
        <dl className="mt-4 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="לקוח" value={<Link href={`/clients/${c.client.id}`} className="text-navy-700 hover:underline">{c.client.fullName}</Link>} />
          <Fact label="מס׳ פנימי" value={c.internalNumber} />
          <Fact label="סוג תיק" value={typeLabel(c.caseType)} />
          <Fact label="ערכאה" value={c.court ? courtLabel(c.court) : null} />
          <Fact label="מספר הליך" value={c.courtCaseNumber && <span dir="ltr">{c.courtCaseNumber}</span>} />
          <Fact label="צד שכנגד" value={c.opposingParty} />
          <Fact label="עו״ד הצד שכנגד" value={c.opposingCounsel} />
          <Fact label="אחראי" value={c.responsibleUser.name} />
        </dl>
      </div>

      <nav aria-label="לשוניות התיק" className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? `/cases/${id}` : `/cases/${id}?tab=${t.key}`}
            aria-current={activeTab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${activeTab === t.key ? "border-navy-700 font-semibold text-navy-800" : "border-transparent text-gray-600 hover:text-navy-700"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="summary" className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 id="summary" className="mb-2 font-semibold">סיכום מצב</h2>
            <p className="whitespace-pre-line">{c.summary || "—"}</p>
            <h3 className="mb-1 mt-4 text-sm text-gray-500">פעולה הבאה</h3>
            <p>{c.nextAction || "—"}</p>
          </section>

          <section aria-labelledby="members" className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="members" className="font-semibold">עובדים משויכים</h2>
              {options && (
                <MembersDialog
                  caseId={c.id}
                  employees={options.employees}
                  selectedIds={c.members.map((m) => m.userId)}
                  responsibleId={c.responsibleUserId}
                />
              )}
            </div>
            {c.members.length === 0 ? (
              <p className="text-sm text-gray-600">לא שויכו עובדים (התיק גלוי למנהלת בלבד)</p>
            ) : (
              <ul className="list-inside list-disc">
                {c.members.map((m) => <li key={m.userId}>{m.user.name}</li>)}
              </ul>
            )}
          </section>

          <section aria-labelledby="deadline" className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 id="deadline" className="mb-2 font-semibold">המועד הקרוב</h2>
            {nextDeadline ? (
              <p>
                {nextDeadline.title}
                <span className="text-gray-600">
                  {" "}· {DEADLINE_TYPE_LABELS[nextDeadline.type as DeadlineType] ?? nextDeadline.type} · {formatDateHe(nextDeadline.date)}
                  {nextDeadline.time ? ` ${nextDeadline.time}` : ""}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-600">אין מועדים קרובים</p>
            )}
          </section>

          <section aria-labelledby="tasks" className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 id="tasks" className="mb-2 font-semibold">משימות פתוחות</h2>
            {openTasks.length === 0 ? (
              <p className="text-sm text-gray-600">אין משימות פתוחות</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {openTasks.map((t) => (
                  <li key={t.id} className="py-2">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-navy-700 hover:underline">{t.title}</Link>
                    <div className="text-sm text-gray-600">
                      {TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status} · עדיפות {TASK_PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority}
                      {t.assignee ? ` · ${t.assignee.name}` : ""}
                      {t.dueDate ? ` · עד ${formatDateHe(t.dueDate)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : activeTab === "tasks" ? (
        <section aria-labelledby="case-tasks" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="case-tasks" className="font-semibold">משימות התיק</h2>
            {taskFormCases.length > 0 && <TaskFormDialog cases={taskFormCases} defaultCaseId={id} />}
          </div>
          <TaskList tasks={caseTasks} showCase={false} emptyText="אין משימות בתיק הזה" />
        </section>
      ) : (
        <section aria-labelledby="history" className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 id="history" className="mb-2 font-semibold">היסטוריית התיק</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-600">אין עדיין אירועים</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.map((e) => (
                <li key={e.id} className="py-2">
                  <div>{e.summary}</div>
                  <div className="text-sm text-gray-600">{e.actorName} · {formatDateTimeHe(e.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
