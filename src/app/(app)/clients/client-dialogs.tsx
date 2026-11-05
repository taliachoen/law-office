"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { FormDialog } from "@/components/form-dialog";
import { CLIENT_TYPE_LABELS, CLIENT_TYPES } from "@/shared/constants";
import type { Option } from "../cases/case-dialogs";
import { addContactAction, deleteClientAction, removeContactAction, saveClientAction } from "./actions";

const TYPE_OPTIONS = CLIENT_TYPES.map((t) => ({ value: t, label: CLIENT_TYPE_LABELS[t] }));

export type ClientFormValues = {
  id: string;
  type: string;
  fullName: string;
  idNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  contactStatus: string;
};

/** יצירת לקוח (בלי client) או עריכה (עם client). מנהלת בלבד; גם השרת אוכף זאת. */
export function ClientFormDialog({ client, contactStatuses }: { client?: ClientFormValues; contactStatuses: Option[] }) {
  const router = useRouter();
  return (
    <FormDialog
      triggerLabel={client ? "עריכה" : "לקוח חדש"}
      triggerVariant={client ? "outline" : "default"}
      title={client ? "עריכת לקוח" : "לקוח חדש"}
      submitLabel={client ? "שמירה" : "יצירת לקוח"}
      action={saveClientAction}
      onSuccess={(result) => {
        if (!client && result.id) router.push(`/clients/${result.id}`);
      }}
    >
      {(errors) => (
        <>
          {client && <input type="hidden" name="id" value={client.id} />}
          <SelectField name="type" label="סוג לקוח" required options={TYPE_OPTIONS} defaultValue={client?.type ?? "PERSON"} error={errors.type} />
          <TextField name="fullName" label="שם מלא" required defaultValue={client?.fullName} error={errors.fullName} />
          <SelectField name="contactStatus" label="סטטוס קשר" options={contactStatuses} defaultValue={client?.contactStatus ?? "ACTIVE"} error={errors.contactStatus} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="idNumber" label="ת״ז / ח״פ" inputMode="numeric" defaultValue={client?.idNumber ?? ""} error={errors.idNumber} />
            <TextField name="phone" label="טלפון" type="tel" defaultValue={client?.phone ?? ""} error={errors.phone} />
          </div>
          <TextField name="email" label="מייל" type="email" dir="ltr" className="text-start" defaultValue={client?.email ?? ""} error={errors.email} />
          <TextField name="address" label="כתובת" defaultValue={client?.address ?? ""} error={errors.address} />
          <TextAreaField name="notes" label="הערות פנימיות" defaultValue={client?.notes ?? ""} error={errors.notes} />
        </>
      )}
    </FormDialog>
  );
}

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      triggerLabel="מחיקה"
      title={`למחוק את הלקוח '${name}'?`}
      description="הלקוח יועבר לסל המחזור. לא ניתן למחוק לקוח שיש לו תיקים פעילים."
      action={() => deleteClientAction(id)}
      onDone={() => router.push("/clients")}
    />
  );
}

export function AddContactDialog({ clientId }: { clientId: string }) {
  return (
    <FormDialog triggerLabel="הוספת איש קשר" triggerVariant="outline" triggerSize="sm" title="איש קשר חדש" submitLabel="הוספה" action={addContactAction}>
      {(errors) => (
        <>
          <input type="hidden" name="clientId" value={clientId} />
          <TextField name="name" label="שם" required error={errors.name} />
          <TextField name="relation" label="קרבה / תפקיד" required placeholder="למשל: אחות, עו״ד קודם" error={errors.relation} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="phone" label="טלפון" type="tel" error={errors.phone} />
            <TextField name="email" label="מייל" type="email" dir="ltr" className="text-start" error={errors.email} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function RemoveContactButton({ contactId, clientId, name }: { contactId: string; clientId: string; name: string }) {
  return (
    <ConfirmDeleteDialog
      triggerLabel="הסרה"
      triggerSize="sm"
      title={`להסיר את איש הקשר '${name}'?`}
      confirmLabel="כן, הסר"
      action={() => removeContactAction(contactId, clientId)}
    />
  );
}
