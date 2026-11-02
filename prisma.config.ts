import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // ברירת מחדל כדי ש-prisma generate לא ייכשל כשאין .env
    url: process.env["DATABASE_URL"] ?? "file:./prisma/dev.db",
  },
});
