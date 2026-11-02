import Link from "next/link";

// מוצג כשמשתמש פונה ישירות לכתובת של משאב שאינו שלו. השרת לא מחזיר את הנתונים עצמם.
export function Forbidden({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="text-xl font-bold text-red-800">אין הרשאה</h1>
      <p className="mt-2 text-sm text-red-900">אין לך הרשאה לצפות בפריט הזה.</p>
      <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-navy-700 underline">
        {backLabel}
      </Link>
    </div>
  );
}
