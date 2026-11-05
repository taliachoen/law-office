"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/shared/constants";

// רק מסכים שכבר נבנו מופיעים בתפריט (אין קישורים מתים).
// כל שלב מוסיף כאן את המסכים שלו.
const NAV_ITEMS: { href: string; label: string; managerOnly?: boolean }[] = [
  { href: "/", label: "לוח בקרה" },
  { href: "/clients", label: "לקוחות" },
  { href: "/cases", label: "תיקים" },
  { href: "/tasks", label: "משימות" },
  { href: "/trash", label: "סל מחזור", managerOnly: true },
];

// managerOnly רק מסתיר קישור מהתפריט; ההרשאה האמיתית נאכפת בשרת בכל מסך.
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* בטלפון התפריט נפתח מכפתור */}
      <button
        type="button"
        className="fixed start-3 top-3 z-30 rounded-md bg-navy-800 px-3 py-2 text-sm text-white md:hidden"
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "סגירת תפריט" : "תפריט"}
      </button>
      <nav
        id="main-nav"
        aria-label="תפריט ראשי"
        className={`${open ? "block" : "hidden"} fixed inset-y-0 start-0 z-20 w-60 bg-navy-900 pt-16 text-white md:static md:block md:pt-6`}
      >
        <div className="px-5 pb-6 text-lg font-bold">משרד דמה</div>
        <ul className="space-y-1 px-3">
          {NAV_ITEMS.filter((item) => !item.managerOnly || role === "MANAGER").map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 ${active ? "bg-navy-700 font-semibold" : "hover:bg-navy-800"}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
