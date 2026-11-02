import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { assertValidOption, getActiveOptions, getLabelMap } from "@/server/services/lookups";
import { ValidationError } from "@/server/errors";
import type { SessionUser } from "@/server/auth/session-user";

const orgA = "test-org-lookup-a";
const orgB = "test-org-lookup-b";
const userA: SessionUser = { id: "u-a", orgId: orgA, name: "א", role: "EMPLOYEE" };

beforeAll(async () => {
  await db.lookupOption.createMany({
    data: [
      { orgId: orgA, list: "CASE_TYPE", code: "DIVORCE", label: "גירושין", sortOrder: 1 },
      { orgId: orgA, list: "CASE_TYPE", code: "ALIMONY", label: "מזונות", sortOrder: 0 },
      { orgId: orgA, list: "CASE_TYPE", code: "OLD", label: "סוג ישן", sortOrder: 2, active: false },
      // ארגון אחר, עם תווית שונה לאותו קוד
      { orgId: orgB, list: "CASE_TYPE", code: "DIVORCE", label: "פירוק שותפות", sortOrder: 0 },
      { orgId: orgB, list: "CASE_TYPE", code: "LABOR", label: "דיני עבודה", sortOrder: 1 },
    ],
  });
});

describe("lookups", () => {
  it("מחזיר רק ערכים פעילים של הארגון, לפי sortOrder", async () => {
    const opts = await getActiveOptions(userA, "CASE_TYPE");
    expect(opts.map((o) => o.code)).toEqual(["ALIMONY", "DIVORCE"]);
  });

  it("לא מדליף ערכים של ארגון אחר", async () => {
    const opts = await getActiveOptions(userA, "CASE_TYPE");
    expect(opts.map((o) => o.code)).not.toContain("LABOR");
    expect(opts.find((o) => o.code === "DIVORCE")?.label).toBe("גירושין");
  });

  it("מפת תוויות כוללת גם ערך שכובה, וקוד לא מוכר מוצג כמו שהוא", async () => {
    const label = await getLabelMap(userA, "CASE_TYPE");
    expect(label("OLD")).toBe("סוג ישן");
    expect(label("GONE")).toBe("GONE");
  });

  it("assertValidOption מקבל קוד פעיל של הארגון", async () => {
    await expect(assertValidOption(db, orgA, "CASE_TYPE", "DIVORCE")).resolves.toBeUndefined();
  });

  it("assertValidOption דוחה קוד לא קיים, כבוי, או של ארגון אחר", async () => {
    await expect(assertValidOption(db, orgA, "CASE_TYPE", "NOPE")).rejects.toThrow(ValidationError);
    await expect(assertValidOption(db, orgA, "CASE_TYPE", "OLD")).rejects.toThrow(ValidationError);
    await expect(assertValidOption(db, orgA, "CASE_TYPE", "LABOR")).rejects.toThrow(ValidationError);
  });

  it("הקוד ייחודי לכל ארגון ורשימה", async () => {
    await expect(
      db.lookupOption.create({ data: { orgId: orgA, list: "CASE_TYPE", code: "DIVORCE", label: "כפילות" } }),
    ).rejects.toThrow();
  });
});
