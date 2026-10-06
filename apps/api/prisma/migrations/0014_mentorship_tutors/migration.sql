ALTER TYPE "MentorshipParticipantRole" ADD VALUE 'TUTOR';

ALTER TABLE "MentorshipCohort"
  ADD COLUMN "targetTutors" INTEGER,
  ADD COLUMN "maximumTutors" INTEGER,
  ADD COLUMN "tutorEligibility" JSONB NOT NULL DEFAULT '{}';
