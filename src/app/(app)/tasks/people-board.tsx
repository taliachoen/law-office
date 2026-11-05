import Link from "next/link";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/task-badges";
import { ROLE_LABELS, type Role } from "@/shared/constants";
import { formatDateHe, todayIso } from "@/shared/dates";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  case: { id: string; title: string };
};

export type PersonLoad = {
  user: { id: string; name: string; role: string };
  total: number;
  overdue: number;
  returned: number;
  tasks: BoardTask[];
};

/**
 * עומס צוות (לשונית "לפי אדם", מנהלת בלבד): עמודה לכל אחד בצוות. במסך צר, כרטיס לכל אדם זה מתחת לזה.
 * "באיחור" מוצג באדום ועם טקסט, כי צבע לבדו אינו מספיק.
 */
export function PeopleBoard({ people }: { people: PersonLoad[] }) {
  const today = todayIso();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {people.map((p) => (
        <section key={p.user.id} aria-labelledby={`person-${p.user.id}`} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 id={`person-${p.user.id}`} className="text-lg font-semibold">
            <Link href={`/tasks?holder=${p.user.id}`} className="text-navy-700 hover:underline">{p.user.name}</Link>
            <span className="ms-2 text-sm font-normal text-gray-600">{ROLE_LABELS[p.user.role as Role] ?? p.user.role}</span>
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-gray-50 p-2">
              <dt className="text-xs text-gray-600">אצלו עכשיו</dt>
              <dd className="text-xl font-bold text-navy-800">{p.total}</dd>
            </div>
            <div className={`rounded-md p-2 ${p.overdue > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <dt className="text-xs text-gray-600">באיחור</dt>
              <dd className={`text-xl font-bold ${p.overdue > 0 ? "text-red-700" : "text-navy-800"}`}>{p.overdue}</dd>
            </div>
            <div className={`rounded-md p-2 ${p.returned > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
              <dt className="text-xs text-gray-600">הוחזרו לתיקון</dt>
              <dd className={`text-xl font-bold ${p.returned > 0 ? "text-orange-800" : "text-navy-800"}`}>{p.returned}</dd>
            </div>
          </dl>

          {p.tasks.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">אין משימות אצלו כרגע</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {p.tasks.map((t) => {
                const late = !!t.dueDate && t.dueDate < today;
                return (
                  <li key={t.id} className="py-2">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-navy-700 hover:underline">{t.title}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <TaskStatusBadge status={t.status} />
                      <TaskPriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-0.5 text-sm text-gray-600">
                      {t.case.title}
                      {t.dueDate && (
                        <span className={late ? "font-semibold text-red-700" : ""}>
                          {" · "}{formatDateHe(t.dueDate)}{late && " · באיחור"}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
