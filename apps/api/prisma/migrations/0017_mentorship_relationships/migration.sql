CREATE TYPE "MentorshipRelationshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ENDED');

CREATE TABLE "MentorshipRelationship" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "menteeParticipantId" TEXT NOT NULL,
  "providerParticipantId" TEXT NOT NULL,
  "status" "MentorshipRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipRelationship_matchId_key" ON "MentorshipRelationship"("matchId");
CREATE INDEX "MentorshipRelationship_programId_status_idx" ON "MentorshipRelationship"("programId", "status");
CREATE INDEX "MentorshipRelationship_cohortId_idx" ON "MentorshipRelationship"("cohortId");
CREATE INDEX "MentorshipRelationship_menteeParticipantId_idx" ON "MentorshipRelationship"("menteeParticipantId");
CREATE INDEX "MentorshipRelationship_providerParticipantId_idx" ON "MentorshipRelationship"("providerParticipantId");

ALTER TABLE "MentorshipRelationship" ADD CONSTRAINT "MentorshipRelationship_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MentorshipMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipRelationship" ADD CONSTRAINT "MentorshipRelationship_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipRelationship" ADD CONSTRAINT "MentorshipRelationship_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipRelationship" ADD CONSTRAINT "MentorshipRelationship_menteeParticipantId_fkey" FOREIGN KEY ("menteeParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipRelationship" ADD CONSTRAINT "MentorshipRelationship_providerParticipantId_fkey" FOREIGN KEY ("providerParticipantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
