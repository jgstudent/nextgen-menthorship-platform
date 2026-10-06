CREATE TYPE "MentorshipResourceType" AS ENUM ('LINK', 'DOCUMENT', 'VIDEO', 'ARTICLE', 'TEMPLATE', 'OTHER');
CREATE TYPE "MentorshipResourceAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "MentorshipResource" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MentorshipResourceType" NOT NULL DEFAULT 'LINK',
    "url" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipResourceAssignment" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "goalId" TEXT,
    "sessionId" TEXT,
    "assigneeParticipantId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "MentorshipResourceAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "completionNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipResourceAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorshipResource_programId_archivedAt_idx" ON "MentorshipResource"("programId", "archivedAt");
CREATE INDEX "MentorshipResource_type_idx" ON "MentorshipResource"("type");
CREATE INDEX "MentorshipResource_createdById_idx" ON "MentorshipResource"("createdById");
CREATE INDEX "MentorshipResourceAssignment_resourceId_status_idx" ON "MentorshipResourceAssignment"("resourceId", "status");
CREATE INDEX "MentorshipResourceAssignment_relationshipId_idx" ON "MentorshipResourceAssignment"("relationshipId");
CREATE INDEX "MentorshipResourceAssignment_goalId_idx" ON "MentorshipResourceAssignment"("goalId");
CREATE INDEX "MentorshipResourceAssignment_sessionId_idx" ON "MentorshipResourceAssignment"("sessionId");
CREATE INDEX "MentorshipResourceAssignment_assigneeParticipantId_status_idx" ON "MentorshipResourceAssignment"("assigneeParticipantId", "status");
CREATE INDEX "MentorshipResourceAssignment_assignedById_idx" ON "MentorshipResourceAssignment"("assignedById");

ALTER TABLE "MentorshipResource" ADD CONSTRAINT "MentorshipResource_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipResource" ADD CONSTRAINT "MentorshipResource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "MentorshipResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "MentorshipGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorshipSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_assigneeParticipantId_fkey" FOREIGN KEY ("assigneeParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipResourceAssignment" ADD CONSTRAINT "MentorshipResourceAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
