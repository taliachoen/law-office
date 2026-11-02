-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "courtCaseNumber" TEXT,
    "caseType" TEXT NOT NULL,
    "court" TEXT,
    "opposingParty" TEXT,
    "opposingCounsel" TEXT,
    "responsibleUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "nextAction" TEXT,
    "dropboxFolderPath" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseMember_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigneeId" TEXT,
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
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "documentVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "taskId" TEXT,
    "inboxItemId" TEXT,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "InboxItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "sourceLink" TEXT,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "court" TEXT,
    "location" TEXT,
    "sourceDescription" TEXT,
    "decisionDate" TEXT,
    "serviceDate" TEXT,
    "responsibleUserId" TEXT NOT NULL,
    "verification" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "externalCalendarEventId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Deadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deadline_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MockEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "mailboxUserId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "linkedCaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "caseId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");

-- CreateIndex
CREATE INDEX "Client_orgId_deletedAt_idx" ON "Client"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Contact_orgId_idx" ON "Contact"("orgId");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Case_orgId_deletedAt_idx" ON "Case"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Case_clientId_idx" ON "Case"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_orgId_internalNumber_key" ON "Case"("orgId", "internalNumber");

-- CreateIndex
CREATE INDEX "CaseMember_orgId_idx" ON "CaseMember"("orgId");

-- CreateIndex
CREATE INDEX "CaseMember_userId_idx" ON "CaseMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMember_caseId_userId_key" ON "CaseMember"("caseId", "userId");

-- CreateIndex
CREATE INDEX "Task_orgId_deletedAt_idx" ON "Task"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "Task"("caseId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "TaskEvent_orgId_idx" ON "TaskEvent"("orgId");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_idx" ON "TaskEvent"("taskId");

-- CreateIndex
CREATE INDEX "Document_orgId_deletedAt_idx" ON "Document"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");

-- CreateIndex
CREATE INDEX "DocumentVersion_orgId_idx" ON "DocumentVersion"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNo_key" ON "DocumentVersion"("documentId", "versionNo");

-- CreateIndex
CREATE INDEX "InboxItem_orgId_deletedAt_idx" ON "InboxItem"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "InboxItem_caseId_idx" ON "InboxItem"("caseId");

-- CreateIndex
CREATE INDEX "Deadline_orgId_deletedAt_idx" ON "Deadline"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Deadline_caseId_idx" ON "Deadline"("caseId");

-- CreateIndex
CREATE INDEX "Deadline_date_idx" ON "Deadline"("date");

-- CreateIndex
CREATE INDEX "MockEmail_orgId_mailboxUserId_idx" ON "MockEmail"("orgId", "mailboxUserId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_orgId_idx" ON "IntegrationConnection"("orgId");

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_createdAt_idx" ON "AuditEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_caseId_idx" ON "AuditEvent"("caseId");
