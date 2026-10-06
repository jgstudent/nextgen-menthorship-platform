CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'APPROVAL_REQUIRED', 'READY_FOR_SIGNATURE', 'SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED', 'COMPLETED', 'VOIDED', 'DECLINED');
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'VOIDED', 'ERROR');
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'VOIDED');

CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "programId" TEXT,
  "projectId" TEXT,
  "taskId" TEXT,
  "beneficiaryId" TEXT,
  "workshopId" TEXT,
  "approvalId" TEXT,
  "fileId" TEXT,
  "docusealTemplateId" TEXT,
  "signedDocumentUrl" TEXT,
  "auditTrailUrl" TEXT,
  "sponsorVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentSubmission" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "docusealSubmissionId" TEXT,
  "docusealTemplateId" TEXT,
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "signedDocumentUrl" TEXT,
  "auditTrailUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionSigner" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
  "docusealSubmitterId" TEXT,
  "signingUrl" TEXT,
  "embeddedUrl" TEXT,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubmissionSigner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Document_workspaceId_idx" ON "Document"("workspaceId");
CREATE INDEX "Document_programId_idx" ON "Document"("programId");
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");
CREATE INDEX "Document_taskId_idx" ON "Document"("taskId");
CREATE INDEX "Document_beneficiaryId_idx" ON "Document"("beneficiaryId");
CREATE INDEX "Document_workshopId_idx" ON "Document"("workshopId");
CREATE INDEX "Document_approvalId_idx" ON "Document"("approvalId");
CREATE INDEX "Document_fileId_idx" ON "Document"("fileId");
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_sponsorVisible_idx" ON "Document"("sponsorVisible");
CREATE INDEX "DocumentSubmission_documentId_idx" ON "DocumentSubmission"("documentId");
CREATE INDEX "DocumentSubmission_requestedById_idx" ON "DocumentSubmission"("requestedById");
CREATE INDEX "DocumentSubmission_status_idx" ON "DocumentSubmission"("status");
CREATE INDEX "DocumentSubmission_docusealSubmissionId_idx" ON "DocumentSubmission"("docusealSubmissionId");
CREATE INDEX "SubmissionSigner_submissionId_idx" ON "SubmissionSigner"("submissionId");
CREATE INDEX "SubmissionSigner_userId_idx" ON "SubmissionSigner"("userId");
CREATE INDEX "SubmissionSigner_email_idx" ON "SubmissionSigner"("email");
CREATE INDEX "SubmissionSigner_status_idx" ON "SubmissionSigner"("status");
CREATE INDEX "SubmissionSigner_docusealSubmitterId_idx" ON "SubmissionSigner"("docusealSubmitterId");

ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionSigner" ADD CONSTRAINT "SubmissionSigner_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DocumentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionSigner" ADD CONSTRAINT "SubmissionSigner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
