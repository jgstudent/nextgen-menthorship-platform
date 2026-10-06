CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "ResolutionStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

ALTER TABLE "Document" ADD COLUMN "meetingId" TEXT;

CREATE TABLE "Policy" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "version" TEXT NOT NULL DEFAULT '1.0',
  "workspaceId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "linkedFileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardResolution" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ResolutionStatus" NOT NULL DEFAULT 'DRAFT',
  "resolutionNumber" TEXT,
  "workspaceId" TEXT NOT NULL,
  "meetingId" TEXT,
  "approvalId" TEXT,
  "documentId" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BoardResolution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Document_meetingId_idx" ON "Document"("meetingId");
CREATE INDEX "Policy_workspaceId_idx" ON "Policy"("workspaceId");
CREATE INDEX "Policy_createdById_idx" ON "Policy"("createdById");
CREATE INDEX "Policy_approvedById_idx" ON "Policy"("approvedById");
CREATE INDEX "Policy_linkedFileId_idx" ON "Policy"("linkedFileId");
CREATE INDEX "Policy_status_idx" ON "Policy"("status");
CREATE INDEX "BoardResolution_workspaceId_idx" ON "BoardResolution"("workspaceId");
CREATE INDEX "BoardResolution_meetingId_idx" ON "BoardResolution"("meetingId");
CREATE INDEX "BoardResolution_approvalId_idx" ON "BoardResolution"("approvalId");
CREATE INDEX "BoardResolution_documentId_idx" ON "BoardResolution"("documentId");
CREATE INDEX "BoardResolution_createdById_idx" ON "BoardResolution"("createdById");
CREATE INDEX "BoardResolution_status_idx" ON "BoardResolution"("status");
CREATE INDEX "BoardResolution_resolutionNumber_idx" ON "BoardResolution"("resolutionNumber");

ALTER TABLE "Document" ADD CONSTRAINT "Document_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_linkedFileId_fkey" FOREIGN KEY ("linkedFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardResolution" ADD CONSTRAINT "BoardResolution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardResolution" ADD CONSTRAINT "BoardResolution_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardResolution" ADD CONSTRAINT "BoardResolution_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardResolution" ADD CONSTRAINT "BoardResolution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BoardResolution" ADD CONSTRAINT "BoardResolution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
