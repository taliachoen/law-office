import { execSync } from "node:child_process";

// איפוס מסד הדמה המקומי: מוחק ויוצר מחדש (migrations) ואז מריץ seed.
// ב-Prisma 7 ה-seed לא רץ אוטומטית אחרי reset, ולכן מריצים אותו במפורש.
// `migrate reset` פועל רק על ה-datasource שב-prisma.config.ts (קובץ SQLite מקומי).
const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

run("npx prisma migrate reset --force");
run("npx prisma generate");
run("npx prisma db seed");
