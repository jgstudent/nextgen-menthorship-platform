CREATE TYPE "MentorshipParticipantRole" AS ENUM ('MENTOR', 'MENTEE');
CREATE TYPE "MentorshipApplicationSource" AS ENUM ('SELF_SERVICE', 'INVITATION', 'ADMIN_CREATED');
CREATE TYPE "MentorshipApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'APPROVED', 'ELIGIBLE', 'INELIGIBLE', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "MentorshipParticipantStatus" AS ENUM ('MATCHING_POOL', 'UNAVAILABLE', 'WAITLISTED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN');

CREATE TABLE "MentorshipApplication" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "applicantUserId" TEXT,
  "reviewedById" TEXT,
  "role" "MentorshipParticipantRole" NOT NULL,
  "source" "MentorshipApplicationSource" NOT NULL DEFAULT 'ADMIN_CREATED',
  "status" "MentorshipApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "timeZone" TEXT NOT NULL,
  "languages" JSONB NOT NULL,
  "locationRegion" TEXT,
  "institution" TEXT,
  "degreeProgram" TEXT,
  "major" TEXT,
  "minor" TEXT,
  "academicLevel" TEXT,
  "graduationYear" INTEGER,
  "gpa" DOUBLE PRECISION,
  "disciplines" JSONB NOT NULL,
  "expertise" JSONB NOT NULL,
  "mentoringCapabilities" JSONB NOT NULL,
  "supportNeeds" JSONB NOT NULL,
  "careerInterests" JSONB NOT NULL,
  "availability" JSONB NOT NULL,
  "meetingMode" "MentorshipMeetingMode",
  "hoursPerWeek" INTEGER,
  "maximumMentees" INTEGER,
  "primaryObjective" TEXT,
  "goals" TEXT,
  "currentChallenge" TEXT,
  "motivation" TEXT,
  "experience" TEXT,
  "consentItems" JSONB NOT NULL,
  "reviewNotes" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipParticipant" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "userId" TEXT,
  "role" "MentorshipParticipantRole" NOT NULL,
  "status" "MentorshipParticipantStatus" NOT NULL DEFAULT 'MATCHING_POOL',
  "availableForMatch" BOOLEAN NOT NULL DEFAULT true,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorshipParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipApplication_cohortId_email_role_key" ON "MentorshipApplication"("cohortId", "email", "role");
CREATE INDEX "MentorshipApplication_programId_idx" ON "MentorshipApplication"("programId");
CREATE INDEX "MentorshipApplication_cohortId_idx" ON "MentorshipApplication"("cohortId");
CREATE INDEX "MentorshipApplication_applicantUserId_idx" ON "MentorshipApplication"("applicantUserId");
CREATE INDEX "MentorshipApplication_status_idx" ON "MentorshipApplication"("status");
CREATE INDEX "MentorshipApplication_role_idx" ON "MentorshipApplication"("role");
CREATE UNIQUE INDEX "MentorshipParticipant_applicationId_key" ON "MentorshipParticipant"("applicationId");
CREATE INDEX "MentorshipParticipant_programId_idx" ON "MentorshipParticipant"("programId");
CREATE INDEX "MentorshipParticipant_cohortId_idx" ON "MentorshipParticipant"("cohortId");
CREATE INDEX "MentorshipParticipant_userId_idx" ON "MentorshipParticipant"("userId");
CREATE INDEX "MentorshipParticipant_role_status_idx" ON "MentorshipParticipant"("role", "status");

ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorshipParticipant" ADD CONSTRAINT "MentorshipParticipant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MentorshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipParticipant" ADD CONSTRAINT "MentorshipParticipant_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipParticipant" ADD CONSTRAINT "MentorshipParticipant_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "MentorshipCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipParticipant" ADD CONSTRAINT "MentorshipParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
