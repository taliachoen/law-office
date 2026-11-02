import { Sidebar } from "@/components/sidebar";
import { UserSwitcher } from "@/components/user-switcher";
import { getCurrentUser, listSwitchableUsers } from "@/server/auth/current-user";

// ה-layout הראשי של כל המסכים: תפריט מימין (RTL), סרגל עליון עם בורר המשתמשים.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const users = await listSwitchableUsers(user.orgId);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-200 bg-white px-4 py-3 ps-24 md:ps-4">
          <UserSwitcher users={users} currentUserId={user.id} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
