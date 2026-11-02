import Link from "next/link";
import { TaskList } from "@/components/task-list";
import { getCurrentUser } from "@/server/auth/current-user";
import { TASK_TABS, getTaskFormOptions, listTasks, type TaskTab } from "@/server/services/tasks";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/shared/constants";
import { TaskFormDialog } from "./task-dialogs";

const TAB_LABELS: Record<TaskTab, string> = {
  open: "פתוחות",
  mine: "המשימות שלי",
  review: "ממתינות לבדיקה",
  done: "הושלמו",
};
const EMPTY_TEXT: Record<TaskTab, string> = {
  open: "אין משימות פתוחות",
  mine: "אין משימות שהוקצו אליך",
  review: "אין משימות הממתינות לבדיקה",
  done: "אין עדיין משימות שהושלמו",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; overdue?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab: TaskTab = (TASK_TABS as readonly string[]).includes(params.tab ?? "") ? (params.tab as TaskTab) : "open";
  const overdue = params.overdue === "1";
  const status = params.status && params.status in TASK_STATUS_LABELS ? params.status : undefined;
  const user = await getCurrentUser();

  const [tasks, formCases] = await Promise.all([
    listTasks(user, { tab, overdue, status }),
    user.role === "MANAGER" ? getTaskFormOptions(user) : null,
  ]);
  const hasExtraFilter = overdue || !!status;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900">משימות</h1>
        {formCases && <TaskFormDialog cases={formCases} />}
      </div>

      <nav aria-label="לשוניות משימות" className="flex flex-wrap gap-1 border-b border-gray-200">
        {TASK_TABS.map((t) => (
          <Link
            key={t}
            href={t === "open" ? "/tasks" : `/tasks?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t ? "border-navy-700 font-semibold text-navy-800" : "border-transparent text-gray-600 hover:text-navy-700"}`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>

      {hasExtraFilter && (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-navy-50 px-3 py-2 text-sm">
          מסונן:
          {overdue && <strong>באיחור</strong>}
          {status && <strong>{TASK_STATUS_LABELS[status as TaskStatus]}</strong>}
          <Link href={tab === "open" ? "/tasks" : `/tasks?tab=${tab}`} className="text-navy-700 underline">ניקוי סינון</Link>
        </p>
      )}

      <TaskList tasks={tasks} emptyText={hasExtraFilter ? "לא נמצאו משימות התואמות לסינון" : EMPTY_TEXT[tab]} />
    </div>
  );
}
