import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // מסד נפרד לבדיקות, כדי שלעולם לא ייגעו בנתוני הדמה של הפיתוח
    env: { DATABASE_URL: "file:./tests/.tmp/test.db" },
    globalSetup: ["./tests/global-setup.ts"],
  },
});
