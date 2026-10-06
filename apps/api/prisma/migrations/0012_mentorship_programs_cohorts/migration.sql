CREATE TYPE "MentorshipProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "MentorshipMeetingMode" AS ENUM ('VIRTUAL', 'IN_PERSON', 'HYBRID');
CREATE TYPE "MentorshipCohortStatus" AS ENUM ('DRAFT', 'APPLICATIONS_OPEN', 'APPLICATIONS_CLOSED', 'MATCHING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

CREATE TABLE "MentorshipProgram" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownerId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "status" "MentorshipProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "programType" TEXT NOT NULL,
  "defaultDuration" TEXT,
  "defaultMeetingMode" "MentorshipMeetingMode" NOT NULL DEFAULT 'VIRTUAL',
  "maximumParticipants" INTEGER,
  "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
  "applicationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "matchingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "stipendsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "externalProgramId" TEXT,
  "integrationSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipCohort" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "status" "MentorshipCohortStatus" NOT NULL DEFAULT 'DRAFT',
  "applicationOpenDate" TIMESTAMP(3),
  "applicationCloseDate" TIMESTAMP(3),
  "mentorApplicationOpenDate" TIMESTAMP(3),
  "mentorApplicationCloseDate" TIMESTAMP(3),
  "menteeApplicationOpenDate" TIMESTAMP(3),
  "menteeApplicationCloseDate" TIMESTAMP(3),
  "programStartDate" TIMESTAMP(3) NOT NULL,
  "programEndDate" TIMESTAMP(3) NOT NULL,
  "targetMentors" INTEGER,
  "maximumMentors" INTEGER,
  "targetMentees" INTEGER,
  "maximumMentees" INTEGER,
  "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
  "mentorEligibility" JSONB NOT NULL,
  "menteeEligibility" JSONB NOT NULL,
  "minimumSessions" INTEGER NOT NULL DEFAULT 0,
  "expectedHours" INTEGER NOT NULL DEFAULT 0,
  "sessionFrequency" TEXT,
  "matchingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "recommendationCount" INTEGER NOT NULL DEFAULT 5,
  "adminApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
  "matchingWeights" JSONB NOT NULL,
  "stipendEnabled" BOOLEAN NOT NULL DEFAULT false,
  "stipendAmountCents" INTEGER,
  "stipendPaymentModel" TEXT,
  "stipendRequirements" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipCohort_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipProgram_organizationId_code_key" ON "MentorshipProgram"("organizationId", "code");
CREATE INDEX "MentorshipProgram_organizationId_idx" ON "MentorshipProgram"("organizationId");
CREATE INDEX "MentorshipProgram_ownerId_idx" ON "MentorshipProgram"("ownerId");
CREATE INDEX "MentorshipProgram_status_idx" ON "MentorshipProgram"("status");
CREATE UNIQUE INDEX "MentorshipCohort_programId_code_key" ON "MentorshipCohort"("programId", "code");
CREATE INDEX "MentorshipCohort_programId_idx" ON "MentorshipCohort"("programId");
CREATE INDEX "MentorshipCohort_status_idx" ON "MentorshipCohort"("status");
CREATE INDEX "MentorshipCohort_programStartDate_programEndDate_idx" ON "MentorshipCohort"("programStartDate", "programEndDate");

ALTER TABLE "MentorshipProgram" ADD CONSTRAINT "MentorshipProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipProgram" ADD CONSTRAINT "MentorshipProgram_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipCohort" ADD CONSTRAINT "MentorshipCohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
