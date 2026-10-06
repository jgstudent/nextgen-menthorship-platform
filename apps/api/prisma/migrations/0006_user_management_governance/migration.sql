CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED', 'PENDING_APPROVAL');

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "User" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"UserStatus" ELSE 'DISABLED'::"UserStatus" END;

CREATE TABLE "UserProjectAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'TEAM_MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProjectAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProgramAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'TEAM_MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProgramAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProjectAssignment_userId_projectId_key" ON "UserProjectAssignment"("userId", "projectId");
CREATE INDEX "UserProjectAssignment_projectId_idx" ON "UserProjectAssignment"("projectId");
CREATE UNIQUE INDEX "UserProgramAssignment_userId_programId_key" ON "UserProgramAssignment"("userId", "programId");
CREATE INDEX "UserProgramAssignment_programId_idx" ON "UserProgramAssignment"("programId");

ALTER TABLE "UserProjectAssignment" ADD CONSTRAINT "UserProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProjectAssignment" ADD CONSTRAINT "UserProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProgramAssignment" ADD CONSTRAINT "UserProgramAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProgramAssignment" ADD CONSTRAINT "UserProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
