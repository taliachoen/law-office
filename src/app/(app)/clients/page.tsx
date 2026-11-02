import Link from "next/link";
import { ClientTypeBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectField } from "@/components/form-fields";
import { getCurrentUser } from "@/server/auth/current-user";
import { listClients } from "@/server/services/clients";
import { CLIENT_TYPE_LABELS, CLIENT_TYPES } from "@/shared/constants";
import { ClientFormDialog } from "./client-dialogs";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "" } = await searchParams;
  const user = await getCurrentUser();
  const clients = await listClients(user, { q, type });
  const filtered = q !== "" || type !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900">לקוחות</h1>
        {user.role === "MANAGER" && <ClientFormDialog />}
      </div>

      {/* חיפוש וסינון: טופס GET רגיל, כך שהתוצאות ניתנות לשיתוף ולסימניה */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid min-w-52 flex-1 gap-1.5">
          <label htmlFor="q" className="text-sm font-medium">חיפוש</label>
          <Input id="q" name="q" defaultValue={q} placeholder="שם, ת״ז או טלפון" />
        </div>
        <div className="w-44">
          <SelectField
            name="type" label="סוג" placeholder="הכול" defaultValue={type}
            options={CLIENT_TYPES.map((t) => ({ value: t, label: CLIENT_TYPE_LABELS[t] }))}
          />
        </div>
        <Button type="submit">חיפוש</Button>
        {filtered && (
          <Link href="/clients" className="pb-1.5 text-sm text-navy-700 underline">ניקוי</Link>
        )}
      </form>

      {clients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          {filtered ? "לא נמצאו לקוחות התואמים לחיפוש" : "אין עדיין לקוחות"}
        </p>
      ) : (
        <>
          {/* מסך רחב: טבלה */}
          <div className="hidden rounded-lg border border-gray-200 bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>מייל</TableHead>
                  <TableHead>תיקים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium text-navy-700 hover:underline">{c.fullName}</Link>
                    </TableCell>
                    <TableCell><ClientTypeBadge type={c.type} /></TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-start">{c.email ?? "—"}</TableCell>
                    <TableCell>{c._count.cases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* טלפון: כרטיסים */}
          <ul className="grid gap-3 md:hidden">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy-800">{c.fullName}</span>
                    <ClientTypeBadge type={c.type} />
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{c.phone ?? "ללא טלפון"} · {c._count.cases} תיקים</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
