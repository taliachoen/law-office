import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session-user";
import { ACTIONS, authorize, can, caseScope, clientScope, inboxScope } from "@/server/policy";
import { ForbiddenError } from "@/server/errors";

const manager: SessionUser = { id: "m1", orgId: "org1", name: "מנהלת", role: "MANAGER" };
const emp: SessionUser = { id: "e1", orgId: "org1", name: "עובד", role: "EMPLOYEE" };

const MANAGER_ONLY = [
  "client:write", "case:write", "case:assign-members", "task:create", "task:assign", "task:review",
  "task:delete", "inbox:mark-viewed", "inbox:delete", "document:delete", "deadline:verify",
  "trash:view", "trash:restore", "settings:manage",
] as const;
const MEMBER_ACTIONS = [
  "client:read", "case:read", "task:read", "document:read", "document:upload",
  "inbox:read", "inbox:add", "deadline:read", "deadline:write",
] as const;

describe("can – מנהלת", () => {
  it("מורשית לכל פעולה בארגון שלה", () => {
    for (const action of ACTIONS) {
      expect(can(manager, action, { orgId: "org1" }), action).toBe(true);
    }
  });
  it("לא מורשית בארגון אחר", () => {
    expect(can(manager, "case:read", { orgId: "org2" })).toBe(false);
  });
});

describe("can – עובד", () => {
  it("נדחה בכל פעולה השמורה למנהלת, גם כשהוא חבר בתיק", () => {
    for (const action of MANAGER_ONLY) {
      expect(can(emp, action, { orgId: "org1", memberUserIds: ["e1"] }), action).toBe(false);
    }
  });
  it("מורשה בפעולות תיק רק כשהוא חבר בתיק", () => {
    for (const action of MEMBER_ACTIONS) {
      expect(can(emp, action, { orgId: "org1", memberUserIds: ["e1", "e2"] }), action).toBe(true);
      expect(can(emp, action, { orgId: "org1", memberUserIds: ["e2"] }), action).toBe(false);
      expect(can(emp, action, { orgId: "org1" }), action).toBe(false);
    }
  });
  it("לא מורשה בארגון אחר גם כשהוא חבר", () => {
    expect(can(emp, "case:read", { orgId: "org2", memberUserIds: ["e1"] })).toBe(false);
  });
  it("מגיש לבדיקה רק משימה שהוקצתה לו", () => {
    expect(can(emp, "task:submit", { orgId: "org1", assigneeId: "e1" })).toBe(true);
    expect(can(emp, "task:submit", { orgId: "org1", assigneeId: "e2" })).toBe(false);
    expect(can(emp, "task:submit", { orgId: "org1", assigneeId: null })).toBe(false);
  });
  it("חומר חדש בלי תיק: מוסיף, ורואה רק מה שהוסיף בעצמו", () => {
    expect(can(emp, "inbox:add", { orgId: "org1", caseless: true })).toBe(true);
    expect(can(emp, "inbox:read", { orgId: "org1", caseless: true, createdById: "e1" })).toBe(true);
    expect(can(emp, "inbox:read", { orgId: "org1", caseless: true, createdById: "e2" })).toBe(false);
    expect(can(emp, "document:upload", { orgId: "org1", caseless: true })).toBe(false);
  });
});

describe("authorize", () => {
  it("זורק ForbiddenError בעברית", () => {
    expect(() => authorize(emp, "client:write", { orgId: "org1" })).toThrow(ForbiddenError);
    expect(() => authorize(emp, "client:write", { orgId: "org1" })).toThrow("אין הרשאה");
  });
  it("לא זורק כשמותר", () => {
    expect(() => authorize(manager, "client:write", { orgId: "org1" })).not.toThrow();
  });
});

describe("בונים של scope", () => {
  it("מנהלת: כל הארגון, בלי רשומות שנמחקו", () => {
    expect(caseScope(manager)).toEqual({ orgId: "org1", deletedAt: null });
    expect(clientScope(manager)).toEqual({ orgId: "org1", deletedAt: null });
    expect(inboxScope(manager)).toEqual({ orgId: "org1", deletedAt: null });
  });
  it("עובד: מסונן לפי חברות בתיק", () => {
    expect(caseScope(emp)).toMatchObject({ orgId: "org1", deletedAt: null, members: { some: { userId: "e1" } } });
    expect(clientScope(emp)).toMatchObject({ cases: { some: caseScope(emp) } });
    expect(inboxScope(emp)).toMatchObject({
      OR: [{ case: caseScope(emp) }, { caseId: null, createdById: "e1" }],
    });
  });
});
