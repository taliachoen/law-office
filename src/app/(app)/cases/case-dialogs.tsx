"use client";

import { useRouter } from "next/navigation";
import { FormDialog } from "@/components/form-dialog";
import { SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { CASE_STATUS_LABELS, CASE_STATUSES } from "@/shared/constants";
import { saveBlockersAction, saveCaseAction, setMembersAction } from "./actions";

export type Option = { value: string; label: string };

export type CaseFormValues = {
  id: string;
  version: number;
  title: string;
  courtCaseNumber: string | null;
  caseType: string;
  court: string | null;
  opposingParty: string | null;
  opposingCounsel: string | null;
  responsibleUserId: string;
  status: string;
  summary: string | null;
  nextAction: string | null;
};

const STATUS_OPTIONS = CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] }));

/** תיק חדש (בלי values) או עריכת תיק קיים (עם values). הלקוח נבחר רק ביצירה. */
export function CaseFormDialog({
  values, clients, defaultClientId, caseTypes, courts, users,
}: {
  values?: CaseFormValues;
  clients?: Option[];
  defaultClientId?: string;
  caseTypes: Option[];
  courts: Option[];
  users: Option[];
}) {
  const router = useRouter();
  return (
    <FormDialog
      triggerLabel={values ? "עריכה" : "תיק חדש"}
      triggerVariant={values ? "outline" : "default"}
      title={values ? "עריכת תיק" : "תיק חדש"}
      description={values ? undefined : "המספר הפנימי יוקצה אוטומטית."}
      submitLabel={values ? "שמירה" : "פתיחת תיק"}
      action={saveCaseAction}
      onSuccess={(result) => {
        if (!values && result.id) router.push(`/cases/${result.id}`);
      }}
    >
      {(errors) => (
        <>
          {values && (
            <>
              <input type="hidden" name="id" value={values.id} />
              <input type="hidden" name="version" value={values.version} />
            </>
          )}
          {!values && clients && (
            <SelectField name="clientId" label="לקוח" required placeholder="בחרו לקוח" options={clients} defaultValue={defaultClientId ?? ""} error={errors.clientId} />
          )}
          <TextField name="title" label="כותרת התיק" required defaultValue={values?.title} error={errors.title} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="caseType" label="סוג תיק" required placeholder="בחרו סוג" options={caseTypes} defaultValue={values?.caseType ?? ""} error={errors.caseType} />
            <SelectField name="status" label="סטטוס" required options={STATUS_OPTIONS} defaultValue={values?.status ?? "ACTIVE"} error={errors.status} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="court" label="ערכאה" placeholder="ללא" options={courts} defaultValue={values?.court ?? ""} error={errors.court} />
            <TextField name="courtCaseNumber" label="מספר הליך" dir="ltr" className="text-start" defaultValue={values?.courtCaseNumber ?? ""} error={errors.courtCaseNumber} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="opposingParty" label="צד שכנגד" defaultValue={values?.opposingParty ?? ""} error={errors.opposingParty} />
            <TextField name="opposingCounsel" label="עו״ד הצד שכנגד" defaultValue={values?.opposingCounsel ?? ""} error={errors.opposingCounsel} />
          </div>
          <SelectField name="responsibleUserId" label="אחראי" required options={users} defaultValue={values?.responsibleUserId ?? users[0]?.value} error={errors.responsibleUserId} />
          <TextAreaField name="summary" label="סיכום מצב" defaultValue={values?.summary ?? ""} error={errors.summary} />
          <TextField name="nextAction" label="פעולה הבאה" defaultValue={values?.nextAction ?? ""} error={errors.nextAction} />
        </>
      )}
    </FormDialog>
  );
}

/** חסם בתיק: מה עוצר אותו כרגע. השארת השדה ריק מסירה את החסם. */
export function BlockersDialog({ caseId, version, blockers }: { caseId: string; version: number; blockers: string | null }) {
  return (
    <FormDialog
      triggerLabel={blockers ? "עריכת חסם" : "הוספת חסם"}
      triggerVariant="outline"
      triggerSize="sm"
      title="חסם בתיק"
      description="מה עוצר את התיק כרגע. השאירו ריק כדי להסיר את החסם."
      submitLabel="שמירה"
      action={saveBlockersAction}
    >
      {(errors) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="version" value={version} />
          <TextAreaField name="blockers" label="החסם" defaultValue={blockers ?? ""} error={errors.blockers} />
        </>
      )}
    </FormDialog>
  );
}

/** שיוך עובדים לתיק. האחראי העובד תמיד משויך, ולכן מסומן ונעול. */
export function MembersDialog({
  caseId, employees, selectedIds, responsibleId,
}: {
  caseId: string;
  employees: Option[];
  selectedIds: string[];
  responsibleId: string;
}) {
  return (
    <FormDialog
      triggerLabel="שיוך עובדים"
      triggerVariant="outline"
      triggerSize="sm"
      title="שיוך עובדים לתיק"
      description="עובד רואה רק תיקים שהוא משויך אליהם."
      submitLabel="שמירה"
      action={setMembersAction}
    >
      {(errors) => (
        <fieldset className="grid gap-2">
          <legend className="sr-only">עובדים משויכים</legend>
          <input type="hidden" name="caseId" value={caseId} />
          {employees.map((e) => {
            const locked = e.value === responsibleId;
            return (
              <label key={e.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="userIds"
                  value={e.value}
                  defaultChecked={locked || selectedIds.includes(e.value)}
                  disabled={locked}
                  className="size-4"
                />
                {e.label}
                {locked && <span className="text-xs text-gray-500">(אחראי על התיק)</span>}
              </label>
            );
          })}
          {/* checkbox נעול לא נשלח בטופס, והשרת מוסיף את האחראי בכל מקרה */}
          {errors.userIds && <p className="text-sm text-red-700">{errors.userIds}</p>}
        </fieldset>
      )}
    </FormDialog>
  );
}
