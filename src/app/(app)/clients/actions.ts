"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { addContact, createClient, deleteClient, removeContact, updateClient } from "@/server/services/clients";
import { clientInputSchema, contactInputSchema, formToObject } from "@/shared/schemas";

// Server Actions של הלקוחות: אימות קלט בשרת, קריאה לשירות (שבודק הרשאה), ורענון המסכים.
// ה-id של לקוח קיים מגיע בשדה מוסתר; אם אין, זו יצירה.

function refresh(clientId?: string) {
  revalidatePath("/clients");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

export async function saveClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const input = formToObject(formData);
  const id = typeof input.id === "string" && input.id ? input.id : undefined;
  return runAction(clientInputSchema, input, async (data) => {
    const user = await getCurrentUser();
    if (id) {
      await updateClient(user, id, data);
      refresh(id);
      return { id };
    }
    const created = await createClient(user, data);
    refresh();
    return created;
  });
}

export async function deleteClientAction(id: string): Promise<ActionState> {
  return runAction(z.string().min(1), id, async (clientId) => {
    await deleteClient(await getCurrentUser(), clientId);
    refresh(clientId);
  });
}

export async function addContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(contactInputSchema, formToObject(formData), async (data) => {
    await addContact(await getCurrentUser(), data);
    refresh(data.clientId);
  });
}

export async function removeContactAction(contactId: string, clientId: string): Promise<ActionState> {
  return runAction(z.string().min(1), contactId, async (id) => {
    await removeContact(await getCurrentUser(), id);
    refresh(clientId);
  });
}
