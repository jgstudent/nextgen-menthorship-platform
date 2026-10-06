CREATE TYPE "MentorshipGoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MentorshipSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "MentorshipAttendanceStatus" AS ENUM ('PENDING', 'ATTENDED', 'ABSENT', 'EXCUSED');

CREATE TABLE "MentorshipGoal" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MentorshipGoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipSession" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "meetingMode" "MentorshipMeetingMode" NOT NULL DEFAULT 'VIRTUAL',
    "location" TEXT,
    "videoUrl" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "status" "MentorshipSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "providerAttendance" "MentorshipAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "menteeAttendance" "MentorshipAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "completedMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorshipProgressUpdate" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "challenges" TEXT,
    "nextSteps" TEXT,
    "progressRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorshipProgressUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorshipGoal_relationshipId_status_idx" ON "MentorshipGoal"("relationshipId", "status");
CREATE INDEX "MentorshipSession_relationshipId_scheduledStart_idx" ON "MentorshipSession"("relationshipId", "scheduledStart");
CREATE INDEX "MentorshipSession_status_scheduledStart_idx" ON "MentorshipSession"("status", "scheduledStart");
CREATE INDEX "MentorshipSession_createdById_idx" ON "MentorshipSession"("createdById");
CREATE INDEX "MentorshipProgressUpdate_relationshipId_createdAt_idx" ON "MentorshipProgressUpdate"("relationshipId", "createdAt");
CREATE INDEX "MentorshipProgressUpdate_authorId_idx" ON "MentorshipProgressUpdate"("authorId");

ALTER TABLE "MentorshipGoal" ADD CONSTRAINT "MentorshipGoal_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipSession" ADD CONSTRAINT "MentorshipSession_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipSession" ADD CONSTRAINT "MentorshipSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorshipProgressUpdate" ADD CONSTRAINT "MentorshipProgressUpdate_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "MentorshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipProgressUpdate" ADD CONSTRAINT "MentorshipProgressUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
