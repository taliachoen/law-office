"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ActionState } from "@/server/actions";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** כפתור שליחה שננעל בזמן שליחה (מניעת לחיצה כפולה). חייב להיות בתוך ה-form. */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "שומר..." : label}
    </Button>
  );
}

function DialogForm({
  action, submitLabel, onDone, children,
}: {
  action: FormAction;
  submitLabel: string;
  onDone: (result: ActionState) => void;
  children: (errors: Record<string, string>) => React.ReactNode;
}) {
  // הקריאה ל-onDone נעשית בתוך ה-action ולא ב-effect. הרכיב הזה נטען מחדש בכל פתיחה, ולכן שגיאות ישנות לא נשארות.
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone(result);
      return result;
    },
    { ok: false },
  );

  return (
    <form action={formAction} className="grid gap-4">
      {children(state.fieldErrors ?? {})}
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>ביטול</DialogClose>
        <SubmitButton label={submitLabel} />
      </DialogFooter>
    </form>
  );
}

/** חלונית עם טופס. הכפתור שפותח אותה והתוכן נקבעים על ידי הרכיב שמשתמש בה. */
export function FormDialog({
  triggerLabel, triggerVariant = "default", triggerSize = "default", title, description, submitLabel,
  action, onSuccess, children,
}: {
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm";
  title: string;
  description?: string;
  submitLabel: string;
  action: FormAction;
  onSuccess?: (result: ActionState) => void;
  children: (errors: Record<string, string>) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogForm
            action={action}
            submitLabel={submitLabel}
            onDone={(result) => {
              setOpen(false);
              onSuccess?.(result);
            }}
          >
            {children}
          </DialogForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
