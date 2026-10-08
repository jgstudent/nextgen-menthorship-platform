CREATE TABLE "MentorshipAccountInvitation" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipAccountInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipAccountInvitation_applicationId_key" ON "MentorshipAccountInvitation"("applicationId");
CREATE UNIQUE INDEX "MentorshipAccountInvitation_tokenHash_key" ON "MentorshipAccountInvitation"("tokenHash");
CREATE INDEX "MentorshipAccountInvitation_programId_idx" ON "MentorshipAccountInvitation"("programId");
CREATE INDEX "MentorshipAccountInvitation_userId_idx" ON "MentorshipAccountInvitation"("userId");
CREATE INDEX "MentorshipAccountInvitation_expiresAt_idx" ON "MentorshipAccountInvitation"("expiresAt");

ALTER TABLE "MentorshipAccountInvitation" ADD CONSTRAINT "MentorshipAccountInvitation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipAccountInvitation" ADD CONSTRAINT "MentorshipAccountInvitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MentorshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipAccountInvitation" ADD CONSTRAINT "MentorshipAccountInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
