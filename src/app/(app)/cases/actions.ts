"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionState } from "@/server/actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { createCase, setCaseBlockers, setCaseMembers, updateCase } from "@/server/services/cases";
import { caseBlockersSchema, caseInputSchema, caseMembersSchema, caseUpdateSchema, formToObject } from "@/shared/schemas";

function refresh(caseId?: string, clientId?: string) {
  revalidatePath("/cases");
  if (caseId) revalidatePath(`/cases/${caseId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

/** יצירה (בלי id) או עדכון (עם id ו-version, לנעילה אופטימית). */
export async function saveCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const input = formToObject(formData);
  const id = typeof input.id === "string" && input.id ? input.id : undefined;

  if (id) {
    return runAction(caseUpdateSchema, input, async (data) => {
      await updateCase(await getCurrentUser(), id, data);
      refresh(id);
      return { id };
    });
  }
  return runAction(caseInputSchema, input, async (data) => {
    const created = await createCase(await getCurrentUser(), data);
    refresh(created.id, data.clientId);
    return created;
  });
}

export async function setMembersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(
    caseMembersSchema,
    { caseId: formData.get("caseId"), userIds: formData.getAll("userIds") },
    async (data) => {
      await setCaseMembers(await getCurrentUser(), data.caseId, data.userIds);
      refresh(data.caseId);
    },
  );
}

/** חסמים בתיק: מנהלת בלבד (השרת אוכף), עם נעילה אופטימית. */
export async function saveBlockersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(caseBlockersSchema, formToObject(formData), async (data) => {
    await setCaseBlockers(await getCurrentUser(), data);
    refresh(data.caseId);
  });
}
