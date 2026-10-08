CREATE TYPE "MentorshipAssignmentStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MentorshipNoteVisibility" AS ENUM ('SHARED', 'STAFF_ONLY');
CREATE TYPE "MentorshipNotificationType" AS ENUM ('APPLICATION', 'INVITATION', 'MATCH_CONFIRMED', 'SESSION_SCHEDULED', 'SESSION_REMINDER', 'SESSION_RESCHEDULED', 'SESSION_CANCELLED', 'ACTION_OVERDUE', 'SYSTEM');

ALTER TABLE "MentorshipNotification"
  ALTER COLUMN "applicationId" DROP NOT NULL,
  ADD COLUMN "relationshipId" TEXT,
  ADD COLUMN "recipientUserId" TEXT,
  ADD COLUMN "type" "MentorshipNotificationType" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "dedupeKey" TEXT;

UPDATE "MentorshipNotification" SET "type" = 'APPLICATION' WHERE "applicationId" IS NOT NULL;

CREATE UNIQUE INDEX "MentorshipNotification_dedupeKey_key" ON "MentorshipNotification"("dedupeKey");
CREATE INDEX "MentorshipNotification_recipientUserId_readAt_idx" ON "MentorshipNotification"("recipientUserId", "readAt");
CREATE INDEX "MentorshipNotification_relationshipId_createdAt_idx" ON "MentorshipNotification"("relationshipId", "createdAt");
ALTER TABLE "MentorshipNotification" ADD CONSTRAINT "MentorshipNotification_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipNotification" ADD CONSTRAINT "MentorshipNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MentorshipAssignment" (
  "id" TEXT NOT NULL,
  "relationshipId" TEXT NOT NULL,
  "sessionId" TEXT,
  "goalId" TEXT,
  "assigneeParticipantId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "MentorshipAssignmentStatus" NOT NULL DEFAULT 'TODO',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorshipAssignment_relationshipId_status_idx" ON "MentorshipAssignment"("relationshipId", "status");
CREATE INDEX "MentorshipAssignment_assigneeParticipantId_status_dueDate_idx" ON "MentorshipAssignment"("assigneeParticipantId", "status", "dueDate");
CREATE INDEX "MentorshipAssignment_sessionId_idx" ON "MentorshipAssignment"("sessionId");
CREATE INDEX "MentorshipAssignment_goalId_idx" ON "MentorshipAssignment"("goalId");
ALTER TABLE "MentorshipAssignment" ADD CONSTRAINT "MentorshipAssignment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipAssignment" ADD CONSTRAINT "MentorshipAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorshipSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipAssignment" ADD CONSTRAINT "MentorshipAssignment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "MentorshipGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipAssignment" ADD CONSTRAINT "MentorshipAssignment_assigneeParticipantId_fkey" FOREIGN KEY ("assigneeParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipAssignment" ADD CONSTRAINT "MentorshipAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MentorshipNote" (
  "id" TEXT NOT NULL,
  "relationshipId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" "MentorshipNoteVisibility" NOT NULL DEFAULT 'SHARED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorshipNote_relationshipId_visibility_createdAt_idx" ON "MentorshipNote"("relationshipId", "visibility", "createdAt");
CREATE INDEX "MentorshipNote_authorId_idx" ON "MentorshipNote"("authorId");
ALTER TABLE "MentorshipNote" ADD CONSTRAINT "MentorshipNote_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipNote" ADD CONSTRAINT "MentorshipNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
