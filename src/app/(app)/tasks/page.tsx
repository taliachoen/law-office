import Link from "next/link";
import { TaskFilterBar } from "@/components/task-filter-bar";
import { TaskList } from "@/components/task-list";
import { getCurrentUser } from "@/server/auth/current-user";
import { listCases } from "@/server/services/cases";
import { TASK_TABS, getTaskFormOptions, getTeamWorkload, listTasks, listTeamMembers, type TaskTab } from "@/server/services/tasks";
import { activeFilterCount, parseTaskFilters } from "@/shared/task-filters";
import { PeopleBoard } from "./people-board";
import { TaskFormDialog } from "./task-dialogs";

type Tab = TaskTab | "people";

const TAB_LABELS: Record<Tab, string> = {
  open: "פתוחות",
  mine: "המשימות שלי",
  review: "ממתינות לבדיקה",
  done: "הושלמו",
  people: "לפי אדם",
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const isManager = user.role === "MANAGER";

  // מזכירות רואה את המשימות לקריאה בלבד ואין לה "המשימות שלי"; "לפי אדם" למנהלת בלבד
  const tabs: Tab[] = isManager
    ? [...TASK_TABS, "people"]
    : user.role === "SECRETARY"
      ? TASK_TABS.filter((t) => t !== "mine")
      : [...TASK_TABS];
  const requested = typeof params.tab === "string" ? params.tab : "";
  const tab: Tab = (tabs as string[]).includes(requested) ? (requested as Tab) : "open";
  const filters = parseTaskFilters(params);

  // כתובת לשונית: שומרת את הסינון הפעיל
  const tabHref = (t: Tab) => {
    const q = new URLSearchParams();
    if (t !== "open") q.set("tab", t);
    if (t !== "people") {
      for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    }
    const s = q.toString();
    return s ? `/tasks?${s}` : "/tasks";
  };

  const nav = (
    <nav aria-label="לשוניות משימות" className="flex flex-wrap gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <Link
          key={t}
          href={tabHref(t)}
          aria-current={tab === t ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t ? "border-navy-700 font-semibold text-navy-800" : "border-transparent text-gray-600 hover:text-navy-700"}`}
        >
          {TAB_LABELS[t]}
        </Link>
      ))}
    </nav>
  );

  if (tab === "people") {
    const people = await getTeamWorkload(user);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">משימות</h1>
        {nav}
        <PeopleBoard people={people} />
      </div>
    );
  }

  const [tasks, formCases, cases, team] = await Promise.all([
    listTasks(user, { ...filters, tab }),
    isManager ? getTaskFormOptions(user) : null,
    listCases(user),
    isManager ? listTeamMembers(user) : null,
  ]);
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900">משימות</h1>
        {formCases && <TaskFormDialog cases={formCases} />}
      </div>

      {nav}

      <TaskFilterBar
        tab={tab}
        filters={filters}
        people={(team ?? []).map((p) => ({ value: p.id, label: p.name }))}
        allLabel={user.role === "EMPLOYEE" ? "כולם (בתיקים שלי)" : "כולם"}
        cases={cases.map((c) => ({ value: c.id, label: `${c.internalNumber} · ${c.title}` }))}
      />

      <TaskList tasks={tasks} emptyText={filtered ? "לא נמצאו משימות התואמות לסינון" : EMPTY_TEXT[tab]} />
    </div>
  );
}
