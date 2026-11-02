"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionState } from "@/server/actions";

/**
 * חלונית אישור מחיקה (אדום). לפי המפרט: המיקוד מתחיל על "ביטול", ו-Esc = ביטול.
 * כפתור האישור ננעל בזמן הביצוע, ושגיאה מהשרת מוצגת בתוך החלונית.
 */
export function ConfirmDeleteDialog({
  triggerLabel, triggerSize = "default", title, description, confirmLabel = "כן, מחק", action, onDone,
}: {
  triggerLabel: string;
  triggerSize?: "default" | "sm";
  title: string;
  description?: string;
  confirmLabel?: string;
  action: () => Promise<ActionState>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setOpen(false);
        onDone?.();
      } else {
        setError(result.error ?? "אירעה שגיאה. נסו שוב");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent initialFocus={cancelRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelRef}>ביטול</AlertDialogCancel>
            <Button type="button" disabled={pending} className="bg-red-700 text-white hover:bg-red-800" onClick={confirm}>
              {pending ? "מוחק..." : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
