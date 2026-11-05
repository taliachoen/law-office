import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDashboardCounts } from "@/server/services/dashboard";
import { ROLE_LABELS } from "@/shared/constants";

// לוח בקרה זמני (שלב 1): ספירות מהמסד, מסוננות לפי המשתמש הנוכחי.
// כרטיס הופך ללחיץ רק כשהמסך שהוא מוביל אליו כבר נבנה.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const counts = await getDashboardCounts(user);

  const cards: { label: string; value: number; warn?: boolean; href?: string }[] = [
    { label: "לקוחות", value: counts.clients, href: "/clients" },
    { label: "תיקים פעילים", value: counts.activeCases, href: "/cases?status=ACTIVE" },
    { label: "משימות פתוחות", value: counts.openTasks, href: "/tasks" },
    { label: "משימות באיחור", value: counts.overdueTasks, warn: counts.overdueTasks > 0, href: "/tasks?overdue=1" },
    { label: counts.reviewCard.label, value: counts.reviewCard.count, href: user.role === "EMPLOYEE" ? "/tasks?tab=mine&status=CHANGES_REQUESTED" : "/tasks?tab=review" },
    { label: "חומר חדש שלא נצפה", value: counts.unseenInbox },
    { label: "מועדים ב-7 הימים הקרובים", value: counts.upcomingDeadlines },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">לוח בקרה</h1>
        <p className="text-sm text-gray-600">
          שלום {user.name} · {ROLE_LABELS[user.role]}. הלוח זמני וכולל ספירות בלבד; כרטיסים לחיצים יתווספו עם המסכים שלהם.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <>
              <div className="text-sm text-gray-600">{card.label}</div>
              <div className={`mt-1 text-3xl font-bold ${card.warn ? "text-red-700" : "text-navy-800"}`}>{card.value}</div>
            </>
          );
          return (
            <li key={card.label} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {card.href ? (
                <Link href={card.href} className="block rounded-lg p-4 hover:bg-navy-50">{body}</Link>
              ) : (
                <div className="p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
