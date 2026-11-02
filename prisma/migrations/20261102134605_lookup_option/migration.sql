-- CreateTable
CREATE TABLE "LookupOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "list" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LookupOption_orgId_list_idx" ON "LookupOption"("orgId", "list");

-- CreateIndex
CREATE UNIQUE INDEX "LookupOption_orgId_list_code_key" ON "LookupOption"("orgId", "list", "code");
