import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { TaskStatusBadge } from "@/components/task-badges";
import { getCurrentUser } from "@/server/auth/current-user";
import { listDeletedNotes } from "@/server/services/case-notes";
import { listDeletedTasks } from "@/server/services/tasks";
import { CASE_NOTE_KIND_LABELS } from "@/shared/constants";
import { formatDateTimeHe } from "@/shared/dates";
import { guard } from "../guard";
import { RestoreNoteButton } from "../cases/[id]/note-dialogs";
import { RestoreTaskButton } from "../tasks/task-dialogs";

// סל מחזור. מכיל משימות ותיעוד בתיק; לקוחות, מסמכים, חומר חדש ומועדים יתווספו בשלבים הבאים.
export default async function TrashPage() {
  const user = await getCurrentUser();
  const result = await guard(async () => ({ tasks: await listDeletedTasks(user), notes: await listDeletedNotes(user) }));
  if (result.forbidden) return <Forbidden backHref="/" backLabel="חזרה ללוח הבקרה" />;
  const { tasks, notes } = result.data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-900">סל מחזור</h1>
      <section aria-labelledby="trash-tasks" className="space-y-3">
        <h2 id="trash-tasks" className="font-semibold">משימות</h2>
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">אין משימות בסל המחזור</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm text-gray-600">
                    <Link href={`/cases/${t.case.id}`} className="hover:underline">{t.case.title}</Link>
                    {" · "}נמחקה על ידי {t.deletedByName}{t.deletedAt && ` · ${formatDateTimeHe(t.deletedAt)}`}
                  </div>
                  {t.statusBeforeTrash && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      תשוחזר למצב: <TaskStatusBadge status={t.statusBeforeTrash} />
                    </div>
                  )}
                </div>
                <RestoreTaskButton taskId={t.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trash-notes" className="space-y-3">
        <h2 id="trash-notes" className="font-semibold">תיעוד בתיקים</h2>
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">אין תיעוד בסל המחזור</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{CASE_NOTE_KIND_LABELS[n.kind]}: <span className="line-clamp-1">{n.body}</span></div>
                  <div className="text-sm text-gray-600">
                    <Link href={`/cases/${n.case.id}`} className="hover:underline">{n.case.title}</Link>
                    {" · "}נמחק על ידי {n.deletedByName}{n.deletedAt && ` · ${formatDateTimeHe(n.deletedAt)}`}
                  </div>
                </div>
                <RestoreNoteButton noteId={n.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
