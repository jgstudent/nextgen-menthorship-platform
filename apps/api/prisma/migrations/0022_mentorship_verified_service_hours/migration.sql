CREATE TYPE "MentorshipServiceHourStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "MentorshipStipendStatus" AS ENUM ('PENDING_REVIEW', 'ELIGIBLE', 'INELIGIBLE', 'APPROVED', 'PAID');

CREATE TABLE "MentorshipServiceHour" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "sessionId" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "description" TEXT,
    "evidenceUrl" TEXT,
    "status" "MentorshipServiceHourStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipServiceHour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipStipendDecision" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "status" "MentorshipStipendStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verifiedMinutesAtDecision" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipStipendDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipStipendDecision_participantId_key" ON "MentorshipStipendDecision"("participantId");
CREATE INDEX "MentorshipServiceHour_programId_status_idx" ON "MentorshipServiceHour"("programId", "status");
CREATE INDEX "MentorshipServiceHour_cohortId_status_idx" ON "MentorshipServiceHour"("cohortId", "status");
CREATE INDEX "MentorshipServiceHour_participantId_status_idx" ON "MentorshipServiceHour"("participantId", "status");
CREATE INDEX "MentorshipServiceHour_relationshipId_serviceDate_idx" ON "MentorshipServiceHour"("relationshipId", "serviceDate");
CREATE INDEX "MentorshipServiceHour_sessionId_idx" ON "MentorshipServiceHour"("sessionId");
CREATE INDEX "MentorshipServiceHour_submittedById_idx" ON "MentorshipServiceHour"("submittedById");
CREATE INDEX "MentorshipServiceHour_reviewedById_idx" ON "MentorshipServiceHour"("reviewedById");
CREATE INDEX "MentorshipStipendDecision_programId_status_idx" ON "MentorshipStipendDecision"("programId", "status");
CREATE INDEX "MentorshipStipendDecision_cohortId_status_idx" ON "MentorshipStipendDecision"("cohortId", "status");
CREATE INDEX "MentorshipStipendDecision_reviewedById_idx" ON "MentorshipStipendDecision"("reviewedById");

ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorshipSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorshipServiceHour" ADD CONSTRAINT "MentorshipServiceHour_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipStipendDecision" ADD CONSTRAINT "MentorshipStipendDecision_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipStipendDecision" ADD CONSTRAINT "MentorshipStipendDecision_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipStipendDecision" ADD CONSTRAINT "MentorshipStipendDecision_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MentorshipParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipStipendDecision" ADD CONSTRAINT "MentorshipStipendDecision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
