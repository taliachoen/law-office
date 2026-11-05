"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormDialog } from "@/components/form-dialog";
import { SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/shared/constants";
import { TASK_COMMAND_LABELS, type TaskCommand } from "@/shared/task-flow";
import { createTaskAction, deleteTaskAction, restoreTaskAction, taskCommandAction, updateTaskAction } from "./actions";

type Option = { value: string; label: string };
export type TaskCaseOption = { id: string; label: string; employees: Option[] };

/** במקום רשימת עובדים ריקה: הסבר וקישור לדף התיק, שם משייכים עובדים. */
function NoEmployeesNotice({ caseId }: { caseId: string }) {
  return (
    <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
      אין עובדים משויכים לתיק הזה.{" "}
      <Link href={`/cases/${caseId}`} className="font-medium underline">
        לשיוך עובד בדף התיק
      </Link>
    </p>
  );
}

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }));

/** משימה חדשה. העובדים שאפשר לבחור תלויים בתיק שנבחר (רק חברי התיק). */
export function TaskFormDialog({ cases, defaultCaseId }: { cases: TaskCaseOption[]; defaultCaseId?: string }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState(defaultCaseId ?? "");
  const employees = cases.find((c) => c.id === caseId)?.employees ?? [];

  return (
    <FormDialog
      triggerLabel="משימה חדשה"
      title="משימה חדשה"
      description="אפשר להעביר לעובד מיד, או להשאיר אצלך ולהעביר מאוחר יותר."
      submitLabel="יצירת משימה"
      action={createTaskAction}
      onSuccess={(result) => result.id && router.push(`/tasks/${result.id}`)}
    >
      {(errors) => (
        <>
          <SelectField
            name="caseId" label="תיק" required placeholder="בחרו תיק" error={errors.caseId}
            options={cases.map((c) => ({ value: c.id, label: c.label }))}
            value={caseId} onChange={(e) => setCaseId(e.target.value)}
          />
          <TextField name="title" label="כותרת" required error={errors.title} />
          <TextAreaField name="instructions" label="הוראות" error={errors.instructions} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="priority" label="עדיפות" required options={PRIORITY_OPTIONS} defaultValue="NORMAL" error={errors.priority} />
            <TextField name="dueDate" label="מועד יעד" type="date" error={errors.dueDate} />
          </div>
          {caseId && employees.length === 0 ? (
            <NoEmployeesNotice caseId={caseId} />
          ) : (
            <SelectField
              key={caseId}
              name="assigneeId" label="העברה לעובד" placeholder={caseId ? "אצלי (משימה פתוחה)" : "בחרו תיק קודם"}
              options={employees} disabled={!caseId} error={errors.assigneeId}
            />
          )}
        </>
      )}
    </FormDialog>
  );
}

// צבעים לפי המפרט: כתום = החזרה לתיקון, ירוק = סיום/הושלם
const ORANGE = "border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200";
const ORANGE_SUBMIT = "bg-orange-600 text-white hover:bg-orange-700";
const GREEN = "border-green-300 bg-green-100 text-green-900 hover:bg-green-200";
const GREEN_SUBMIT = "bg-green-700 text-white hover:bg-green-800";

type CommandTask = { id: string; version: number; title: string };

/** כפתור וחלונית לכל פקודה במכונת המצבים שדורשת קלט (הכול חוץ ממחיקה). */
export function TaskCommandDialog({
  task, command, employees, caseId,
}: {
  task: CommandTask;
  caseId: string;
  command: Exclude<TaskCommand, "DELETE">;
  /** חברי התיק שאפשר להעביר אליהם (להעברה ולפתיחה מחדש) */
  employees: Option[];
}) {
  const label = TASK_COMMAND_LABELS[command];
  const isReturn = command === "REQUEST_CHANGES";
  const isComplete = command === "COMPLETE";

  return (
    <FormDialog
      triggerLabel={label}
      triggerVariant={isReturn || isComplete ? "outline" : command === "SUBMIT" ? "default" : "outline"}
      triggerClassName={isReturn ? ORANGE : isComplete ? GREEN : undefined}
      submitClassName={isReturn ? ORANGE_SUBMIT : isComplete ? GREEN_SUBMIT : undefined}
      title={label}
      description={`המשימה: ${task.title}`}
      submitLabel={label}
      action={taskCommandAction}
    >
      {(errors) => (
        <>
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="command" value={command} />
          <input type="hidden" name="version" value={task.version} />

          {command === "ASSIGN" &&
            (employees.length === 0 ? (
              <NoEmployeesNotice caseId={caseId} />
            ) : (
              <SelectField name="assigneeId" label="עובד" required placeholder="בחרו עובד" options={employees} error={errors.assigneeId} />
            ))}
          {command === "SUBMIT" && (
            <TextAreaField name="text" label="הערת מענה" required placeholder="מה בוצע, ומה כדאי שהעורכת תבדוק" error={errors.text} />
          )}
          {isReturn && (
            <TextAreaField name="text" label="מה צריך לתקן" required error={errors.text} />
          )}
          {isComplete && (
            <TextAreaField name="text" label="סיכום ביצוע" required error={errors.text} />
          )}
          {command === "REOPEN" && (
            <>
              <TextAreaField name="text" label="סיבה לפתיחה מחדש" required error={errors.text} />
              {employees.length === 0 ? (
                <NoEmployeesNotice caseId={caseId} />
              ) : (
                <SelectField name="assigneeId" label="העברה לעובד (אופציונלי)" placeholder="ללא (משימה פתוחה)" options={employees} error={errors.assigneeId} />
              )}
            </>
          )}
        </>
      )}
    </FormDialog>
  );
}

export type TaskEditValues = {
  id: string;
  version: number;
  title: string;
  instructions: string | null;
  priority: string;
  dueDate: string | null;
};

/** עריכת פרטי משימה (מנהלת). הסטטוס והעובד משתנים רק דרך כפתורי הפעולה. */
export function EditTaskDialog({ task }: { task: TaskEditValues }) {
  return (
    <FormDialog triggerLabel="עריכה" triggerVariant="outline" title="עריכת משימה" submitLabel="שמירה" action={updateTaskAction}>
      {(errors) => (
        <>
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="version" value={task.version} />
          <TextField name="title" label="כותרת" required defaultValue={task.title} error={errors.title} />
          <TextAreaField name="instructions" label="הוראות" defaultValue={task.instructions ?? ""} error={errors.instructions} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="priority" label="עדיפות" required options={PRIORITY_OPTIONS} defaultValue={task.priority} error={errors.priority} />
            <TextField name="dueDate" label="מועד יעד" type="date" defaultValue={task.dueDate ?? ""} error={errors.dueDate} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function DeleteTaskButton({ task }: { task: CommandTask }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      triggerLabel="מחיקה"
      title={`למחוק את המשימה '${task.title}'?`}
      description="המשימה תועבר לסל המחזור וניתן יהיה לשחזר אותה משם."
      action={() => deleteTaskAction(task.id, task.version)}
      onDone={() => router.push("/tasks")}
    />
  );
}

/** שחזור משימה מסל המחזור. הכפתור ננעל בזמן הביצוע, ושגיאה מוצגת לידו. */
export function RestoreTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button" variant="outline" size="sm" disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreTaskAction(taskId);
            setError(result.ok ? null : (result.error ?? "אירעה שגיאה. נסו שוב"));
          })
        }
      >
        {pending ? "משחזר..." : "שחזור"}
      </Button>
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
