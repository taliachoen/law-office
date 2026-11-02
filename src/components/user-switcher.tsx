"use client";

import { useState, useTransition } from "react";
import { switchUser } from "@/server/auth/switch-user";
import { ROLE_LABELS, type Role } from "@/shared/constants";

type Props = {
  users: { id: string; name: string; role: Role }[];
  currentUserId: string;
};

// בורר משתמשים (דגם בלבד). הבחירה נשמרת ב-cookie בשרת, וההרשאות נאכפות לפיה.
export function UserSwitcher({ users, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await switchUser({ userId });
      if (!result.ok) setError(result.error ?? "החלפת המשתמש נכשלה");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">מצב פיתוח</span>
      <label htmlFor="user-switcher" className="text-sm text-gray-600">
        צפייה בתור:
      </label>
      <select
        id="user-switcher"
        value={currentUserId}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({ROLE_LABELS[u.role]})
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
