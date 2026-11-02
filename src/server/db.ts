import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 דורש driver adapter. כאן נבחר better-sqlite3 לקובץ המקומי;
// במעבר ל-Postgres מחליפים רק את השורה הזו (ואת ה-datasource).
export function createPrismaClient(url: string = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db") {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// מופע יחיד. ב-dev של Next מודולים נטענים מחדש, ולכן שומרים אותו על globalThis
// כדי לא לפתוח חיבור חדש לקובץ בכל שמירה.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = typeof db;
