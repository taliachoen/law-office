import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// מכין מסד SQLite נקי לבדיקות: מוחק את הקובץ הישן ומריץ את כל ה-migrations.
export default function setup() {
  const dir = path.resolve(__dirname, ".tmp");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["test.db", "test.db-journal"]) {
    fs.rmSync(path.join(dir, f), { force: true });
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./tests/.tmp/test.db" },
  });
}
