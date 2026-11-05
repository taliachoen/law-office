"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { createNote, deleteNote, restoreNote, updateNote } from "@/server/services/case-notes";
import { formToObject, noteInputSchema, noteUpdateSchema } from "@/shared/schemas";

function refresh(caseId?: string) {
  if (caseId) revalidatePath(`/cases/${caseId}`);
  revalidatePath("/trash");
}

/** יצירה (בלי noteId) או עדכון (עם noteId ו-version). השרת בודק הרשאה וחלון 24 השעות. */
export async function saveNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const input = formToObject(formData);
  const caseId = typeof input.caseId === "string" ? input.caseId : undefined;
  if (typeof input.noteId === "string" && input.noteId) {
    return runAction(noteUpdateSchema, input, async (data) => {
      await updateNote(await getCurrentUser(), data);
      refresh(caseId);
    });
  }
  return runAction(noteInputSchema, input, async (data) => {
    const created = await createNote(await getCurrentUser(), data);
    refresh(data.caseId);
    return created;
  });
}

export async function deleteNoteAction(noteId: string, caseId: string): Promise<ActionState> {
  return runAction(z.string().min(1), noteId, async (id) => {
    await deleteNote(await getCurrentUser(), id);
    refresh(caseId);
  });
}

export async function restoreNoteAction(noteId: string): Promise<ActionState> {
  return runAction(z.string().min(1), noteId, async (id) => {
    await restoreNote(await getCurrentUser(), id);
    refresh();
  });
}
