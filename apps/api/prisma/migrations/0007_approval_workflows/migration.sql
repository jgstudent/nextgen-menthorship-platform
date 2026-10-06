CREATE TYPE "ApprovalType" AS ENUM ('PROGRAM_APPROVAL', 'PROJECT_APPROVAL', 'TASK_APPROVAL', 'FILE_APPROVAL', 'BENEFICIARY_APPROVAL', 'WORKSHOP_APPROVAL', 'SPONSOR_VISIBILITY_APPROVAL', 'BUDGET_APPROVAL', 'GENERAL_REQUEST');
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED');
CREATE TYPE "ApprovalPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "ApprovalAction" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED', 'REOPENED', 'COMMENTED', 'DELETED');

CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "ApprovalType" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
  "requestedById" TEXT NOT NULL,
  "assignedApproverId" TEXT,
  "workspaceId" TEXT NOT NULL,
  "programId" TEXT,
  "projectId" TEXT,
  "taskId" TEXT,
  "beneficiaryId" TEXT,
  "workshopId" TEXT,
  "fileId" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalComment" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalHistory" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "action" "ApprovalAction" NOT NULL,
  "actorId" TEXT NOT NULL,
  "previousStatus" "ApprovalStatus",
  "newStatus" "ApprovalStatus",
  "notes" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Approval_workspaceId_idx" ON "Approval"("workspaceId");
CREATE INDEX "Approval_programId_idx" ON "Approval"("programId");
CREATE INDEX "Approval_projectId_idx" ON "Approval"("projectId");
CREATE INDEX "Approval_taskId_idx" ON "Approval"("taskId");
CREATE INDEX "Approval_beneficiaryId_idx" ON "Approval"("beneficiaryId");
CREATE INDEX "Approval_workshopId_idx" ON "Approval"("workshopId");
CREATE INDEX "Approval_fileId_idx" ON "Approval"("fileId");
CREATE INDEX "Approval_requestedById_idx" ON "Approval"("requestedById");
CREATE INDEX "Approval_assignedApproverId_idx" ON "Approval"("assignedApproverId");
CREATE INDEX "Approval_status_idx" ON "Approval"("status");
CREATE INDEX "Approval_type_idx" ON "Approval"("type");
CREATE INDEX "Approval_dueDate_idx" ON "Approval"("dueDate");
CREATE INDEX "ApprovalComment_approvalId_idx" ON "ApprovalComment"("approvalId");
CREATE INDEX "ApprovalComment_authorId_idx" ON "ApprovalComment"("authorId");
CREATE INDEX "ApprovalHistory_approvalId_idx" ON "ApprovalHistory"("approvalId");
CREATE INDEX "ApprovalHistory_actorId_idx" ON "ApprovalHistory"("actorId");
CREATE INDEX "ApprovalHistory_timestamp_idx" ON "ApprovalHistory"("timestamp");

ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_assignedApproverId_fkey" FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
