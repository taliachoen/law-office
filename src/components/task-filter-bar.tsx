import Link from "next/link";
import { SelectField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/shared/constants";
import { TASK_DUE_FILTERS, TASK_DUE_LABELS, activeFilterCount, type TaskFilterParams } from "@/shared/task-filters";

type Option = { value: string; label: string };

/**
 * סרגל סינון המשימות (סעיף 6.4 במפרט). טופס GET רגיל: הסינון נשמר בכתובת, ולכן אפשר לשמור קישור.
 * "אצל מי" מציע לכל אחד "כולם" ו"אני"; מנהלת מקבלת גם את כל הצוות (השרת אוכף זאת בכל מקרה).
 */
export function TaskFilterBar({ tab, filters, people, cases }: {
  tab: string;
  filters: TaskFilterParams;
  people: Option[];
  cases: Option[];
}) {
  const active = activeFilterCount(filters) > 0;
  const holderOptions = [{ value: "me", label: "אני" }, ...people];
  return (
    <form method="get" action="/tasks" aria-label="סינון משימות" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      {tab !== "open" && <input type="hidden" name="tab" value={tab} />}
      <SelectField name="holder" label="אצל מי" placeholder="כולם" options={holderOptions} defaultValue={filters.holder ?? ""} />
      <SelectField name="caseId" label="תיק" placeholder="כל התיקים" options={cases} defaultValue={filters.caseId ?? ""} />
      <SelectField
        name="status" label="סטטוס" placeholder="הכול" defaultValue={filters.status ?? ""}
        options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))}
      />
      <SelectField
        name="priority" label="עדיפות" placeholder="הכול" defaultValue={filters.priority ?? ""}
        options={TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }))}
      />
      <SelectField
        name="due" label="מועד יעד" placeholder="הכול" defaultValue={filters.due ?? ""}
        options={TASK_DUE_FILTERS.map((d) => ({ value: d, label: TASK_DUE_LABELS[d] }))}
      />
      <TextField name="from" label="מתאריך (בטווח)" type="date" defaultValue={filters.from ?? ""} />
      <TextField name="to" label="עד תאריך (בטווח)" type="date" defaultValue={filters.to ?? ""} />
      <div className="flex items-end gap-3">
        <Button type="submit">סינון</Button>
        {active && (
          <Link href={tab === "open" ? "/tasks" : `/tasks?tab=${tab}`} className="pb-1.5 text-sm text-navy-700 underline">
            ניקוי סינון
          </Link>
        )}
      </div>
    </form>
  );
}
