import Link from "next/link";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/task-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateHe, todayIso } from "@/shared/dates";

export type TaskListRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  case: { id: string; title: string; internalNumber: string };
  assignee: { name: string } | null;
};

function Due({ task, today }: { task: TaskListRow; today: string }) {
  if (!task.dueDate) return <>—</>;
  const late = task.dueDate < today && task.status !== "COMPLETED";
  return (
    <span className={late ? "font-semibold text-red-700" : ""}>
      {formatDateHe(task.dueDate)}
      {late && " · באיחור"}
    </span>
  );
}

/** רשימת משימות: טבלה במסך רחב, כרטיסים בטלפון. מצב ריק מוגדר ע"י הקורא (emptyText). */
export function TaskList({ tasks, emptyText, showCase = true }: { tasks: TaskListRow[]; emptyText: string; showCase?: boolean }) {
  const today = todayIso();
  if (tasks.length === 0) {
    return <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{emptyText}</p>;
  }
  return (
    <>
      <div className="hidden rounded-lg border border-gray-200 bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>משימה</TableHead>
              {showCase && <TableHead>תיק</TableHead>}
              <TableHead>סטטוס</TableHead>
              <TableHead>עובד</TableHead>
              <TableHead>מועד יעד</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/tasks/${t.id}`} className="font-medium text-navy-700 hover:underline">{t.title}</Link>
                  <div className="mt-1"><TaskPriorityBadge priority={t.priority} /></div>
                </TableCell>
                {showCase && (
                  <TableCell>
                    <Link href={`/cases/${t.case.id}`} className="hover:underline">{t.case.title}</Link>
                  </TableCell>
                )}
                <TableCell><TaskStatusBadge status={t.status} /></TableCell>
                <TableCell>{t.assignee?.name ?? "—"}</TableCell>
                <TableCell><Due task={t} today={today} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-navy-800">{t.title}</span>
                <TaskStatusBadge status={t.status} />
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {showCase && <>{t.case.title} · </>}
                {t.assignee?.name ?? "לא הועברה"} · <Due task={t} today={today} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
