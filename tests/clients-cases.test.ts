import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session-user";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { addContact, createClient, deleteClient, getClientDetail, listClients, removeContact, updateClient } from "@/server/services/clients";
import { createCase, getCaseDetail, getCaseHistory, listCases, setCaseMembers, updateCase } from "@/server/services/cases";
import { todayIso } from "@/shared/dates";
import type { CaseInput, ClientInput } from "@/shared/schemas";

const orgId = "test-org-cases";
let manager: SessionUser;
let empA: SessionUser;
let empB: SessionUser;
let clientA: string; // לקוח עם תיק של א' בלבד
let clientB: string; // לקוח עם תיק של ב' בלבד
let caseA: string;
let caseB: string;

const clientInput = (over: Partial<ClientInput> = {}): ClientInput => ({ type: "PERSON", fullName: "לקוח חדש", ...over });
const caseInput = (clientId: string, over: Partial<CaseInput> = {}): CaseInput => ({
  clientId, title: "תיק חדש", caseType: "DIVORCE", responsibleUserId: manager.id, status: "ACTIVE", ...over,
});

beforeAll(async () => {
  const mk = async (name: string, role: "MANAGER" | "EMPLOYEE", email: string): Promise<SessionUser> => {
    const u = await db.user.create({ data: { orgId, name, role, email } });
    return { id: u.id, orgId, name, role };
  };
  manager = await mk("מנהלת", "MANAGER", "m@cases.test");
  empA = await mk("עובד א", "EMPLOYEE", "a@cases.test");
  empB = await mk("עובדת ב", "EMPLOYEE", "b@cases.test");

  await db.lookupOption.createMany({
    data: [
      { orgId, list: "CASE_TYPE", code: "DIVORCE", label: "גירושין" },
      { orgId, list: "CASE_TYPE", code: "ALIMONY", label: "מזונות" },
      { orgId, list: "COURT", code: "FAMILY_COURT", label: "בית משפט לענייני משפחה" },
      { orgId, list: "CONTACT_STATUS", code: "ACTIVE", label: "פעיל" },
      { orgId, list: "CONTACT_STATUS", code: "AWAITING_CLIENT", label: "ממתין לתגובת הלקוח" },
    ],
  });

  clientA = (await createClient(manager, clientInput({ fullName: "דנה לביא" }))).id;
  clientB = (await createClient(manager, clientInput({ fullName: "יוסי מזרחי", phone: "050-1234567" }))).id;
  caseA = (await createCase(manager, caseInput(clientA, { title: "לביא – גירושין", courtCaseNumber: "111-22", responsibleUserId: empA.id }))).id;
  caseB = (await createCase(manager, caseInput(clientB, { title: "מזרחי – מזונות", caseType: "ALIMONY", responsibleUserId: empB.id }))).id;
});

describe("הרשאות עובד – תיקים", () => {
  it("רשימת התיקים מכילה רק תיקים שהוא חבר בהם", async () => {
    expect((await listCases(empA)).map((c) => c.id)).toEqual([caseA]);
    expect((await listCases(empB)).map((c) => c.id)).toEqual([caseB]);
    expect((await listCases(manager)).map((c) => c.id).sort()).toEqual([caseA, caseB].sort());
  });

  it("גישה ישירה לתיק של אחר נדחית, ותיק שלא קיים הוא NotFound", async () => {
    await expect(getCaseDetail(empA, caseB)).rejects.toThrow(ForbiddenError);
    await expect(getCaseHistory(empA, caseB)).rejects.toThrow(ForbiddenError);
    await expect(getCaseDetail(empA, "no-such-case")).rejects.toThrow(NotFoundError);
    await expect(getCaseDetail(empA, caseA)).resolves.toBeTruthy();
  });

  it("עובד אינו יוצר, עורך או משייך, ולא נכתב אירוע ביקורת", async () => {
    const before = await db.auditEvent.count({ where: { orgId } });
    await expect(createClient(empA, clientInput())).rejects.toThrow(ForbiddenError);
    await expect(createCase(empA, caseInput(clientA))).rejects.toThrow(ForbiddenError);
    await expect(setCaseMembers(empA, caseA, [empA.id])).rejects.toThrow(ForbiddenError);
    await expect(deleteClient(empA, clientA)).rejects.toThrow(ForbiddenError);
    expect(await db.auditEvent.count({ where: { orgId } })).toBe(before);
  });
});

describe("הרשאות עובד – לקוחות", () => {
  it("רואה רק לקוחות שיש להם תיק שהוא חבר בו", async () => {
    expect((await listClients(empA)).map((c) => c.id)).toEqual([clientA]);
    await expect(getClientDetail(empA, clientB)).rejects.toThrow(ForbiddenError);
    const detail = await getClientDetail(empA, clientA);
    expect(detail.cases.map((c) => c.id)).toEqual([caseA]);
  });

  it("מספר התיקים ברשימה סופר רק תיקים שהוא רואה", async () => {
    await createCase(manager, caseInput(clientA, { title: "תיק נוסף של א" })); // בלי עובדים
    const [row] = await listClients(empA);
    expect(row?._count.cases).toBe(1);
    const mgrRow = (await listClients(manager)).find((c) => c.id === clientA);
    expect(mgrRow?._count.cases).toBe(2);
  });
});

describe("חיפוש וסינון", () => {
  it("תיקים: לפי שם לקוח, מספר הליך וסטטוס", async () => {
    expect((await listCases(manager, { q: "מזרחי" })).map((c) => c.id)).toEqual([caseB]);
    expect((await listCases(manager, { q: "111-22" })).map((c) => c.id)).toEqual([caseA]);
    expect((await listCases(manager, { status: "CLOSED" }))).toHaveLength(0);
    expect((await listCases(manager, { caseType: "ALIMONY" })).map((c) => c.id)).toEqual([caseB]);
  });
  it("לקוחות: לפי שם וטלפון", async () => {
    expect((await listClients(manager, { q: "דנה" })).map((c) => c.id)).toEqual([clientA]);
    expect((await listClients(manager, { q: "1234567" })).map((c) => c.id)).toEqual([clientB]);
  });
});

describe("createCase", () => {
  it("מקצה מספר פנימי רץ, כותב אירוע בהיסטוריה, ומצרף עובד אחראי כחבר", async () => {
    const year = todayIso().slice(0, 4);
    const id = (await createCase(manager, caseInput(clientA, { responsibleUserId: empB.id, court: "FAMILY_COURT" }))).id;
    const created = await db.case.findUniqueOrThrow({ where: { id }, include: { members: true } });
    expect(created.internalNumber).toMatch(new RegExp(`^${year}-\\d{3}$`));
    expect(created.members.map((m) => m.userId)).toEqual([empB.id]);
    const history = await getCaseHistory(manager, id);
    expect(history[0]).toMatchObject({ action: "CREATE", actorName: "מנהלת" });
    const second = await db.case.findUniqueOrThrow({ where: { id: (await createCase(manager, caseInput(clientA))).id } });
    expect(Number(second.internalNumber.slice(5))).toBe(Number(created.internalNumber.slice(5)) + 1);
  });

  it("דוחה סוג תיק או ערכאה שאינם ברשימה, לקוח של ארגון אחר, ואחראי לא קיים", async () => {
    await expect(createCase(manager, caseInput(clientA, { caseType: "NOPE" }))).rejects.toThrow(ValidationError);
    await expect(createCase(manager, caseInput(clientA, { court: "NOPE" }))).rejects.toThrow(ValidationError);
    const foreign = await db.client.create({ data: { orgId: "other-org", type: "PERSON", fullName: "זר" } });
    await expect(createCase(manager, caseInput(foreign.id))).rejects.toThrow(ValidationError);
    await expect(createCase(manager, caseInput(clientA, { responsibleUserId: "ghost" }))).rejects.toThrow(ValidationError);
  });
});

describe("updateCase – נעילה אופטימית", () => {
  it("גרסה ישנה נדחית, גרסה נוכחית מצליחה ומעלה את הגרסה", async () => {
    const id = (await createCase(manager, caseInput(clientA, { title: "לעדכון", summary: "סיכום ישן" }))).id;
    const { version } = await db.case.findUniqueOrThrow({ where: { id } });
    const base = { ...caseInput(clientA, { title: "כותרת חדשה" }), version };
    const { clientId: _omit, ...update } = base;
    void _omit;

    await updateCase(manager, id, update);
    const after = await db.case.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ title: "כותרת חדשה", version: version + 1, summary: null }); // שדה שרוקן נמחק
    await expect(updateCase(manager, id, update)).rejects.toThrow(ConflictError); // אותה גרסה ישנה שוב
    const history = await getCaseHistory(manager, id);
    expect(history[0]?.summary).toContain("כותרת");
    expect(history[0]?.summary).toContain("סיכום מצב");
  });

  it("עובד לא יכול לעדכן", async () => {
    const { version } = await db.case.findUniqueOrThrow({ where: { id: caseA } });
    const { clientId: _omit, ...update } = { ...caseInput(clientA), version };
    void _omit;
    await expect(updateCase(empA, caseA, update)).rejects.toThrow(ForbiddenError);
  });
});

describe("setCaseMembers", () => {
  it("משייך ומסיר, והאחראי העובד נשאר חבר", async () => {
    const id = (await createCase(manager, caseInput(clientB, { responsibleUserId: empA.id }))).id;
    await setCaseMembers(manager, id, [empB.id]);
    let members = await db.caseMember.findMany({ where: { caseId: id } });
    expect(members.map((m) => m.userId).sort()).toEqual([empA.id, empB.id].sort());

    await setCaseMembers(manager, id, []);
    members = await db.caseMember.findMany({ where: { caseId: id } });
    expect(members.map((m) => m.userId)).toEqual([empA.id]);
    expect((await getCaseHistory(manager, id))[0]?.summary).toContain("הוסרו");
  });

  it("דוחה משתמש שאינו עובד פעיל בארגון", async () => {
    await expect(setCaseMembers(manager, caseA, [manager.id])).rejects.toThrow(ValidationError);
    await expect(setCaseMembers(manager, caseA, ["ghost"])).rejects.toThrow(ValidationError);
  });
});

describe("לקוחות – עדכון, אנשי קשר ומחיקה", () => {
  it("עדכון מנקה שדה שרוקן", async () => {
    const id = (await createClient(manager, clientInput({ fullName: "לעדכון", phone: "050-0000000" }))).id;
    await updateClient(manager, id, clientInput({ fullName: "לעדכון", phone: undefined }));
    expect((await db.client.findUniqueOrThrow({ where: { id } })).phone).toBeNull();
  });

  it("הוספה והסרה של איש קשר נרשמות ב-Audit", async () => {
    await addContact(manager, { clientId: clientA, name: "רונית לביא", relation: "אחות" });
    const contact = await db.contact.findFirstOrThrow({ where: { clientId: clientA } });
    await expect(removeContact(empA, contact.id)).rejects.toThrow(ForbiddenError);
    await removeContact(manager, contact.id);
    expect(await db.contact.count({ where: { clientId: clientA } })).toBe(0);
    const events = await db.auditEvent.findMany({ where: { entityType: "Contact", orgId } });
    expect(events.map((e) => e.action).sort()).toEqual(["CREATE", "DELETE"]);
  });

  it("מחיקה רכה: נדחית כשיש תיק פעיל, מותרת כשכל התיקים סגורים, והלקוח נעלם מהרשימות", async () => {
    const id = (await createClient(manager, clientInput({ fullName: "למחיקה" }))).id;
    const caseId = (await createCase(manager, caseInput(id))).id;
    await expect(deleteClient(manager, id)).rejects.toThrow("תיקים פעילים");

    await db.case.update({ where: { id: caseId }, data: { status: "CLOSED" } });
    await deleteClient(manager, id);
    const row = await db.client.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(manager.id);
    expect((await listClients(manager)).map((c) => c.id)).not.toContain(id);
    await expect(getClientDetail(manager, id)).rejects.toThrow(NotFoundError);
  });
});
