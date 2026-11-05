import Link from "next/link";
import { CaseStatusBadge, ClientTypeBadge, ContactStatusBadge } from "@/components/badges";
import { Forbidden } from "@/components/forbidden";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/policy";
import { getClientDetail } from "@/server/services/clients";
import { getActiveOptions, getLabelMap } from "@/server/services/lookups";
import { guard } from "../../guard";
import { CaseFormDialog } from "../../cases/case-dialogs";
import { loadCaseFormOptions } from "../../cases/form-options";
import { AddContactDialog, ClientFormDialog, DeleteClientButton, RemoveContactButton } from "../client-dialogs";

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const result = await guard(() => getClientDetail(user, id));
  if (result.forbidden) return <Forbidden backHref="/clients" backLabel="חזרה ללקוחות" />;

  const { client, cases } = result.data;
  const isManager = user.role === "MANAGER";
  // עריכה ויצירה: מנהלת ומזכירות. מחיקה: מנהלת בלבד. גם השרת אוכף זאת.
  const canWrite = can(user, "client:write", { orgId: user.orgId });
  const [caseTypeLabel, statusLabel, statusActive] = await Promise.all([
    getLabelMap(user, "CASE_TYPE"),
    getLabelMap(user, "CONTACT_STATUS"),
    getActiveOptions(user, "CONTACT_STATUS"),
  ]);
  // סטטוס נוכחי שכובה ברשימה נשאר זמין בטופס, כדי שפתיחתו לא תשנה אותו בשקט
  const statusSelect = statusActive.map((o) => ({ value: o.code, label: o.label }));
  if (!statusSelect.some((o) => o.value === client.contactStatus)) {
    statusSelect.push({ value: client.contactStatus, label: `${statusLabel(client.contactStatus)} (לא פעיל)` });
  }
  // אפשרויות הטופס נטענות רק למי שרשאי (שירות המשתמשים בודק הרשאה)
  const options = canWrite ? await loadCaseFormOptions(user) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-navy-700 hover:underline">← כל הלקוחות</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">{client.fullName}</h1>
            <ClientTypeBadge type={client.type} />
            <ContactStatusBadge code={client.contactStatus} label={statusLabel(client.contactStatus)} />
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <ClientFormDialog client={client} contactStatuses={statusSelect} />
              {isManager && <DeleteClientButton id={client.id} name={client.fullName} />}
            </div>
          )}
        </div>
      </div>

      <section aria-labelledby="details" className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id="details" className="mb-3 font-semibold">פרטים</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="ת״ז / ח״פ" value={client.idNumber} />
          <Detail label="טלפון" value={client.phone} />
          <Detail label="מייל" value={client.email} />
          <Detail label="כתובת" value={client.address} />
        </dl>
        <div className="mt-4">
          <h3 className="text-sm text-gray-500">הערות פנימיות</h3>
          <p className="mt-0.5 whitespace-pre-line">{client.notes || "—"}</p>
        </div>
      </section>

      <section aria-labelledby="contacts" className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="contacts" className="font-semibold">אנשי קשר</h2>
          {canWrite && <AddContactDialog clientId={client.id} />}
        </div>
        {client.contacts.length === 0 ? (
          <p className="text-sm text-gray-600">אין אנשי קשר</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {client.contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-600"> · {c.relation}</span>
                  <div className="text-sm text-gray-600">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
                </div>
                {canWrite && <RemoveContactButton contactId={c.id} clientId={client.id} name={c.name} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cases" className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="cases" className="font-semibold">תיקים</h2>
          {options && (
            <CaseFormDialog
              defaultClientId={client.id}
              clients={[{ value: client.id, label: client.fullName }]}
              caseTypes={options.caseTypes} courts={options.courts} users={options.users}
            />
          )}
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-gray-600">אין עדיין תיקים ללקוח הזה</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cases.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/cases/${c.id}`} className="font-medium text-navy-700 hover:underline">{c.title}</Link>
                  <div className="text-sm text-gray-600">
                    {c.internalNumber} · {caseTypeLabel(c.caseType)} · אחראי: {c.responsibleUser.name}
                  </div>
                </div>
                <CaseStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
