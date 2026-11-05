"use client";

import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormDialog } from "@/components/form-dialog";
import { SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { CASE_NOTE_KINDS, CASE_NOTE_KIND_LABELS } from "@/shared/constants";
import { deleteNoteAction, restoreNoteAction, saveNoteAction } from "../notes-actions";

const KIND_OPTIONS = CASE_NOTE_KINDS.map((k) => ({ value: k, label: CASE_NOTE_KIND_LABELS[k] }));

export type NoteFormValues = {
  id: string;
  version: number;
  kind: string;
  /** ערך לשדה datetime-local, בשעון ישראל */
  occurredAt: string;
  participants: string | null;
  body: string;
};

/** תיעוד חדש (בלי note) או עריכה (עם note). השרת אוכף מי רשאי לערוך ותוך כמה זמן. */
export function NoteFormDialog({ caseId, note }: { caseId: string; note?: NoteFormValues }) {
  return (
    <FormDialog
      triggerLabel={note ? "עריכה" : "תיעוד חדש"}
      triggerVariant={note ? "outline" : "default"}
      triggerSize={note ? "sm" : "default"}
      title={note ? "עריכת תיעוד" : "תיעוד חדש"}
      submitLabel={note ? "שמירה" : "הוספה"}
      action={saveNoteAction}
    >
      {(errors) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          {note && (
            <>
              <input type="hidden" name="noteId" value={note.id} />
              <input type="hidden" name="version" value={note.version} />
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="kind" label="סוג" required options={KIND_OPTIONS} defaultValue={note?.kind ?? "CALL"} error={errors.kind} />
            <TextField
              name="occurredAt" label="מתי זה קרה" type="datetime-local" defaultValue={note?.occurredAt ?? ""} error={errors.occurredAt}
              aria-describedby="occurredAt-hint"
            />
          </div>
          <p id="occurredAt-hint" className="-mt-2 text-sm text-gray-600">אם משאירים ריק, נרשם הרגע הנוכחי.</p>
          <TextField name="participants" label="משתתפים" placeholder="למשל: הלקוחה ובעלה" defaultValue={note?.participants ?? ""} error={errors.participants} />
          <TextAreaField name="body" label="תוכן" required rows={6} defaultValue={note?.body} error={errors.body} />
        </>
      )}
    </FormDialog>
  );
}

export function DeleteNoteButton({ noteId, caseId }: { noteId: string; caseId: string }) {
  return (
    <ConfirmDeleteDialog
      triggerLabel="מחיקה"
      triggerSize="sm"
      title="למחוק את התיעוד?"
      description="התיעוד יועבר לסל המחזור וניתן לשחזר אותו משם."
      action={() => deleteNoteAction(noteId, caseId)}
    />
  );
}

/** שחזור תיעוד מסל המחזור. הכפתור ננעל בזמן הביצוע, ושגיאה מוצגת לידו. */
export function RestoreNoteButton({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button" variant="outline" size="sm" disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreNoteAction(noteId);
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
