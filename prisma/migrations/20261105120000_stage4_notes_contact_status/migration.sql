-- AlterTable
ALTER TABLE "Case" ADD COLUMN "blockers" TEXT;

-- CreateTable
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "participants" TEXT,
    "body" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "contactStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT
);
INSERT INTO "new_Client" ("address", "createdAt", "deletedAt", "deletedById", "email", "fullName", "id", "idNumber", "notes", "orgId", "phone", "type", "updatedAt") SELECT "address", "createdAt", "deletedAt", "deletedById", "email", "fullName", "id", "idNumber", "notes", "orgId", "phone", "type", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE INDEX "Client_orgId_deletedAt_idx" ON "Client"("orgId", "deletedAt");
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT,
    "taskId" TEXT,
    "inboxItemId" TEXT,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "InboxItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("caseId", "createdAt", "createdById", "deletedAt", "deletedById", "id", "inboxItemId", "orgId", "source", "taskId", "title", "updatedAt") SELECT "caseId", "createdAt", "createdById", "deletedAt", "deletedById", "id", "inboxItemId", "orgId", "source", "taskId", "title", "updatedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_orgId_deletedAt_idx" ON "Document"("orgId", "deletedAt");
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");
CREATE TABLE "new_InboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "sourceLink" TEXT,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalFileId" TEXT,
    "externalVersion" TEXT,
    "suggestedCaseId" TEXT,
    "matchReason" TEXT,
    "readStatus" TEXT,
    "createdById" TEXT NOT NULL,
    "viewedById" TEXT,
    "viewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "InboxItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InboxItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InboxItem" ("caseId", "createdAt", "createdById", "deletedAt", "deletedById", "id", "kind", "note", "orgId", "sourceLink", "title", "updatedAt", "urgent", "viewedAt", "viewedById") SELECT "caseId", "createdAt", "createdById", "deletedAt", "deletedById", "id", "kind", "note", "orgId", "sourceLink", "title", "updatedAt", "urgent", "viewedAt", "viewedById" FROM "InboxItem";
DROP TABLE "InboxItem";
ALTER TABLE "new_InboxItem" RENAME TO "InboxItem";
CREATE INDEX "InboxItem_orgId_deletedAt_idx" ON "InboxItem"("orgId", "deletedAt");
CREATE INDEX "InboxItem_caseId_idx" ON "InboxItem"("caseId");
CREATE UNIQUE INDEX "InboxItem_orgId_source_externalFileId_externalVersion_key" ON "InboxItem"("orgId", "source", "externalFileId", "externalVersion");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigneeId" TEXT,
    "inboxItemId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TEXT,
    "completionSummary" TEXT,
    "statusBeforeTrash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "InboxItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "caseId", "completionSummary", "createdAt", "createdById", "deletedAt", "deletedById", "dueDate", "id", "instructions", "orgId", "priority", "status", "statusBeforeTrash", "title", "updatedAt", "version") SELECT "assigneeId", "caseId", "completionSummary", "createdAt", "createdById", "deletedAt", "deletedById", "dueDate", "id", "instructions", "orgId", "priority", "status", "statusBeforeTrash", "title", "updatedAt", "version" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_orgId_deletedAt_idx" ON "Task"("orgId", "deletedAt");
CREATE INDEX "Task_caseId_idx" ON "Task"("caseId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CaseNote_orgId_deletedAt_idx" ON "CaseNote"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "CaseNote_caseId_occurredAt_idx" ON "CaseNote"("caseId", "occurredAt");

