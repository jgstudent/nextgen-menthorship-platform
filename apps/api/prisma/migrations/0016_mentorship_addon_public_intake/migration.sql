ALTER TABLE "Organization" ADD COLUMN "enabledAddOns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Organization" SET "enabledAddOns" = ARRAY['MENTORSHIP'] WHERE EXISTS (SELECT 1 FROM "MentorshipProgram" WHERE "MentorshipProgram"."organizationId" = "Organization"."id");

ALTER TABLE "MentorshipProgram"
  ADD COLUMN "publicApplicationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicApplicationToken" TEXT,
  ADD COLUMN "inquiryEmail" TEXT;
CREATE UNIQUE INDEX "MentorshipProgram_publicApplicationToken_key" ON "MentorshipProgram"("publicApplicationToken");

CREATE TABLE "MentorshipNotification" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "programId" TEXT NOT NULL, "applicationId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "message" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MentorshipNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MentorshipNotification_organizationId_readAt_idx" ON "MentorshipNotification"("organizationId", "readAt");
CREATE INDEX "MentorshipNotification_programId_idx" ON "MentorshipNotification"("programId");

CREATE TABLE "MentorshipEmailOutbox" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "programId" TEXT NOT NULL, "applicationId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "sentAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MentorshipEmailOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MentorshipEmailOutbox_sentAt_createdAt_idx" ON "MentorshipEmailOutbox"("sentAt", "createdAt");
CREATE INDEX "MentorshipEmailOutbox_organizationId_idx" ON "MentorshipEmailOutbox"("organizationId");

ALTER TABLE "MentorshipNotification" ADD CONSTRAINT "MentorshipNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipNotification" ADD CONSTRAINT "MentorshipNotification_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipNotification" ADD CONSTRAINT "MentorshipNotification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MentorshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipEmailOutbox" ADD CONSTRAINT "MentorshipEmailOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipEmailOutbox" ADD CONSTRAINT "MentorshipEmailOutbox_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipEmailOutbox" ADD CONSTRAINT "MentorshipEmailOutbox_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MentorshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
