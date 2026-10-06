ALTER TABLE "MentorshipCohort" ALTER COLUMN "tutorEligibility" DROP DEFAULT;
ALTER INDEX "MentorshipMatch_cohortId_menteeParticipantId_providerParticipan" RENAME TO "MentorshipMatch_cohortId_menteeParticipantId_providerPartic_key";
