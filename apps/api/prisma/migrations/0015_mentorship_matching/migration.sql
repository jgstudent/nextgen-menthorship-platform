CREATE TYPE "MentorshipMatchStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'ACTIVE', 'ENDED');

CREATE TABLE "MentorshipMatch" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "menteeParticipantId" TEXT NOT NULL,
  "providerParticipantId" TEXT NOT NULL,
  "status" "MentorshipMatchStatus" NOT NULL DEFAULT 'PROPOSED',
  "score" INTEGER NOT NULL,
  "scoreBreakdown" JSONB NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MentorshipMatch_cohortId_menteeParticipantId_providerParticipantId_key" ON "MentorshipMatch"("cohortId", "menteeParticipantId", "providerParticipantId");
CREATE INDEX "MentorshipMatch_programId_status_idx" ON "MentorshipMatch"("programId", "status");
CREATE INDEX "MentorshipMatch_cohortId_idx" ON "MentorshipMatch"("cohortId");
ALTER TABLE "MentorshipMatch" ADD CONSTRAINT "MentorshipMatch_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipMatch" ADD CONSTRAINT "MentorshipMatch_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipMatch" ADD CONSTRAINT "MentorshipMatch_menteeParticipantId_fkey" FOREIGN KEY ("menteeParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipMatch" ADD CONSTRAINT "MentorshipMatch_providerParticipantId_fkey" FOREIGN KEY ("providerParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipMatch" ADD CONSTRAINT "MentorshipMatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
