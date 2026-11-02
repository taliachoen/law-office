import Link from "next/link";
import { CaseStatusBadge } from "@/components/badges";
import { SelectField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/server/auth/current-user";
import { listCases } from "@/server/services/cases";
import { listClients } from "@/server/services/clients";
import { getActiveOptions, getLabelMap } from "@/server/services/lookups";
import { CASE_STATUS_LABELS, CASE_STATUSES } from "@/shared/constants";
import { CaseFormDialog } from "./case-dialogs";
import { loadCaseFormOptions } from "./form-options";

type SearchParams = { q?: string; status?: string; caseType?: string; responsibleId?: string };

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = "", status = "", caseType = "", responsibleId = "" } = await searchParams;
  const user = await getCurrentUser();
  const isManager = user.role === "MANAGER";

  const [cases, typeOptions, typeLabel, options, clients] = await Promise.all([
    listCases(user, { q, status, caseType, responsibleId }),
    getActiveOptions(user, "CASE_TYPE"),
    getLabelMap(user, "CASE_TYPE"),
    isManager ? loadCaseFormOptions(user) : null,
    isManager ? listClients(user) : null,
  ]);
  const filtered = [q, status, caseType, responsibleId].some((v) => v !== "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900">תיקים</h1>
        {options && clients && (
          <CaseFormDialog
            clients={clients.map((c) => ({ value: c.id, label: c.fullName }))}
            caseTypes={options.caseTypes} courts={options.courts} users={options.users}
          />
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid min-w-52 flex-1 gap-1.5">
          <label htmlFor="q" className="text-sm font-medium">חיפוש</label>
          <Input id="q" name="q" defaultValue={q} placeholder="כותרת, לקוח, מספר פנימי או מספר הליך" />
        </div>
        <div className="w-40">
          <SelectField
            name="status" label="סטטוס" placeholder="הכול" defaultValue={status}
            options={CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] }))}
          />
        </div>
        <div className="w-48">
          <SelectField
            name="caseType" label="סוג" placeholder="הכול" defaultValue={caseType}
            options={typeOptions.map((t) => ({ value: t.code, label: t.label }))}
          />
        </div>
        {options && (
          <div className="w-44">
            <SelectField name="responsibleId" label="אחראי" placeholder="הכול" defaultValue={responsibleId} options={options.users} />
          </div>
        )}
        <Button type="submit">סינון</Button>
        {filtered && <Link href="/cases" className="pb-1.5 text-sm text-navy-700 underline">ניקוי</Link>}
      </form>

      {cases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          {filtered ? "לא נמצאו תיקים התואמים לסינון" : "אין עדיין תיקים"}
        </p>
      ) : (
        <>
          <div className="hidden rounded-lg border border-gray-200 bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מס׳ פנימי</TableHead>
                  <TableHead>כותרת</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>אחראי</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">{c.internalNumber}</TableCell>
                    <TableCell>
                      <Link href={`/cases/${c.id}`} className="font-medium text-navy-700 hover:underline">{c.title}</Link>
                    </TableCell>
                    <TableCell>{c.client.fullName}</TableCell>
                    <TableCell>{typeLabel(c.caseType)}</TableCell>
                    <TableCell>{c.responsibleUser.name}</TableCell>
                    <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-3 md:hidden">
            {cases.map((c) => (
              <li key={c.id}>
                <Link href={`/cases/${c.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-navy-800">{c.title}</span>
                    <CaseStatusBadge status={c.status} />
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {c.internalNumber} · {c.client.fullName} · {typeLabel(c.caseType)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
