import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/task-badges";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTaskDetail } from "@/server/services/tasks";
import { TASK_EVENT_LABELS, type TaskEventType, type TaskStatus } from "@/shared/constants";
import { formatDateHe, formatDateTimeHe, todayIso } from "@/shared/dates";
import { availableCommands } from "@/shared/task-flow";
import { guard } from "../../guard";
import { DeleteTaskButton, EditTaskDialog, TaskCommandDialog } from "../task-dialogs";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5">{children || "—"}</dd>
    </div>
  );
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const result = await guard(() => getTaskDetail(user, id));
  if (result.forbidden) return <Forbidden backHref="/tasks" backLabel="חזרה למשימות" />;

  const task = result.data;
  const status = task.status as TaskStatus;
  // הכפתורים נגזרים מאותה מכונת מצבים שהשרת אוכף, לפי המצב והתפקיד
  const commands = availableCommands(status, {
    isManager: user.role === "MANAGER",
    isAssignee: task.assigneeId === user.id,
  });
  const employees = task.case.members.map((m) => ({ value: m.user.id, label: m.user.name }));
  const commandTask = { id: task.id, version: task.version, title: task.title };
  const late = !!task.dueDate && task.dueDate < todayIso() && status !== "COMPLETED";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tasks" className="text-sm text-navy-700 hover:underline">← כל המשימות</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900">{task.title}</h1>
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>

      {(commands.length > 0 || user.role === "MANAGER") && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="פעולות על המשימה">
          {user.role === "MANAGER" && <EditTaskDialog task={task} />}
          {commands.map((command) =>
            command === "DELETE" ? (
              <DeleteTaskButton key={command} task={commandTask} />
            ) : (
              <TaskCommandDialog key={command} task={commandTask} command={command} employees={employees} />
            ),
          )}
        </div>
      )}

      <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="תיק">
          <Link href={`/cases/${task.case.id}`} className="text-navy-700 hover:underline">{task.case.title}</Link>
        </Fact>
        <Fact label="עובד">{task.assignee?.name}</Fact>
        <Fact label="מועד יעד">
          {task.dueDate && (
            <span className={late ? "font-semibold text-red-700" : ""}>
              {formatDateHe(task.dueDate)}{late && " · באיחור"}
            </span>
          )}
        </Fact>
        <Fact label="נוצרה על ידי">{task.createdBy.name} · {formatDateTimeHe(task.createdAt)}</Fact>
      </dl>

      <section aria-labelledby="instructions" className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id="instructions" className="mb-2 font-semibold">הוראות</h2>
        <p className="whitespace-pre-line">{task.instructions || "—"}</p>
        {task.completionSummary && (
          <>
            <h3 className="mb-1 mt-4 text-sm font-semibold text-green-800">סיכום ביצוע</h3>
            <p className="whitespace-pre-line">{task.completionSummary}</p>
          </>
        )}
      </section>

      {/* קבצים מצורפים ייבנו בשלב המסמכים; עד אז לא מוצג אזור קבצים */}
      <section aria-labelledby="timeline" className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id="timeline" className="mb-3 font-semibold">ציר זמן</h2>
        <ol className="space-y-3">
          {task.events.map((e) => (
            <li key={e.id} className="border-s-2 border-navy-100 ps-3">
              <div className="font-medium">{TASK_EVENT_LABELS[e.type as TaskEventType] ?? e.type}</div>
              <div className="text-sm text-gray-600">{e.actor.name} · {formatDateTimeHe(e.createdAt)}</div>
              {e.note && <p className="mt-1 whitespace-pre-line text-sm">{e.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
