# מצב הפרויקט

עודכן: 2026-11-02

## שלב 1 – שלד: הושלם, ממתין לאישור

### מה נבנה
- Next.js 16 (App Router) + TypeScript strict + Tailwind 4, עברית ו-RTL, גופן Heebo.
- Prisma 7.10.1 + SQLite (`better-sqlite3`), סכמה מלאה לפי סעיף 5 במפרט, migration `init`.
- seed בעברית: 3 משתמשים, 12 לקוחות, 15 תיקים, 25 משימות, 10 חומר חדש, 20 מועדים (18 עתידיים + 2 שעברו), 30 מיילים. בלי קבצים (שלב 4).
- `src/server`: `db`, `auth/current-user` + בורר משתמשים (cookie), `policy` (can / authorize / caseScope / clientScope / inboxScope), `audit` (כותב רק בתוך טרנזקציה), `errors`, `services/dashboard`.
- `src/shared`: `constants` (ערכים ותוויות בעברית), `dates` (Asia/Jerusalem), `schemas` (zod).
- layout עם תפריט וסרגל עליון, לוח בקרה זמני עם ספירות, מסך שגיאה.
- התפריט כולל רק "לוח בקרה", כי מסכים שלא נבנו לא מופיעים (אין כפתורים מתים).

### מה נבדק בפועל
- `npm run typecheck`, `npm run lint`: עוברים.
- `npm test`: 17 בדיקות עוברות (הרשאות, scope, ספירות לוח הבקרה לפי משתמש, audit בטרנזקציה כולל rollback).
- `npm run build`: עובר.
- `npm run dev`: הדף `/` מחזיר 200, `lang="he" dir="rtl"`, ספירות שונות לכל משתמש, cookie לא תקין חוזר למנהלת.

### מה לא נבדק
- לא נבדק בדפדפן אמיתי: מראה, גופן, תפריט הטלפון, החלפת משתמש בלחיצה (נבדק רק ה-HTML בשרת).
- `npm run db:reset` לא הורץ על ידי Claude: Prisma חוסם `migrate reset` מסוכן כשהוא מורץ על ידי סוכן AI ודורש הסכמה מפורשת. ה-seed הורץ על מסד ריק בעזרת `prisma db seed`.

### החלטות והערות
- `AuditEvent` קיבל שדה `caseId` (תוספת למפרט) כדי שלשונית "היסטוריה" בתיק תוכל לשלוף אירועים.
- `orgId`, `deletedById`, `verifiedById`, `viewedById` הם מחרוזות בלי מפתח זר.
- חומר חדש בלי תיק: עובד רואה רק מה שהוסיף בעצמו.
- TypeScript 5.9 ו-ESLint 9 (לא הגרסאות האחרונות), כי typescript-eslint תומך עד TS 6.0.
- npm 11 חוסם install scripts כברירת מחדל; אושרו רק `better-sqlite3`, `prisma`, `@prisma/engines`, `esbuild`.
- `AGENTS.md` נוצר אוטומטית על ידי `next dev`.

### שלב הבא
שלב 2 – לקוחות ותיקים. (shadcn/ui יתווסף רק בו.)
