"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { createTask, restoreTask, runTaskCommand } from "@/server/services/tasks";
import { formToObject, taskCommandSchema, taskInputSchema } from "@/shared/schemas";

function refresh(taskId?: string, caseId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/trash");
  revalidatePath("/");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  if (caseId) revalidatePath(`/cases/${caseId}`);
}

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(taskInputSchema, formToObject(formData), async (data) => {
    const created = await createTask(await getCurrentUser(), data);
    refresh(created.id, data.caseId);
    return created;
  });
}

/** כל מעבר במכונת המצבים (העברה, הגשה, החזרה, סיום, פתיחה מחדש, מחיקה). השרת אוכף מי רשאי ומאיזה מצב. */
export async function taskCommandAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(taskCommandSchema, formToObject(formData), async (data) => {
    await runTaskCommand(await getCurrentUser(), data);
    refresh(data.taskId);
  });
}

export async function deleteTaskAction(taskId: string, version: number): Promise<ActionState> {
  return runAction(taskCommandSchema, { taskId, command: "DELETE", version }, async (data) => {
    await runTaskCommand(await getCurrentUser(), data);
    refresh(taskId);
  });
}

export async function restoreTaskAction(taskId: string): Promise<ActionState> {
  return runAction(z.string().min(1), taskId, async (id) => {
    await restoreTask(await getCurrentUser(), id);
    refresh(id);
  });
}
