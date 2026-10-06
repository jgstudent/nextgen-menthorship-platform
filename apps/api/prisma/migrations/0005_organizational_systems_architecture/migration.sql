ALTER TYPE "UserRole" RENAME VALUE 'VIEWER' TO 'SPONSOR_VIEWER';
ALTER TYPE "UserRole" ADD VALUE 'BENEFICIARY';

CREATE TYPE "ProgramStatus" AS ENUM ('PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ProgramVisibility" AS ENUM ('INTERNAL', 'SPONSOR_VISIBLE', 'PUBLIC_SUMMARY');
CREATE TYPE "BeneficiaryProgramStatus" AS ENUM ('APPLICANT', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'ALUMNI');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'DROPPED');
CREATE TYPE "WorkshopVisibility" AS ENUM ('INTERNAL', 'SPONSOR_VISIBLE', 'BENEFICIARY_VISIBLE', 'PUBLIC_SUMMARY');
CREATE TYPE "AttendanceStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'MISSED', 'EXCUSED');

CREATE TABLE "Program" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "visibility" "ProgramVisibility" NOT NULL DEFAULT 'INTERNAL',
  "status" "ProgramStatus" NOT NULL DEFAULT 'PLANNING',
  "ownerId" TEXT,
  "workspaceId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Beneficiary" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "country" TEXT NOT NULL,
  "city" TEXT,
  "programStatus" "BeneficiaryProgramStatus" NOT NULL DEFAULT 'APPLICANT',
  "notes" TEXT,
  "assignedMentorId" TEXT,
  "onboardingDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramEnrollment" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "enrollmentDate" TIMESTAMP(3) NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "assignedMentorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeneficiaryProject" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeneficiaryProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workshop" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "programId" TEXT NOT NULL,
  "instructorId" TEXT,
  "location" TEXT,
  "virtualMeetingUrl" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER,
  "visibility" "WorkshopVisibility" NOT NULL DEFAULT 'INTERNAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopEnrollment" (
  "id" TEXT NOT NULL,
  "workshopId" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "attendance" "AttendanceStatus" NOT NULL DEFAULT 'REGISTERED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  CONSTRAINT "WorkshopEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorAssignment" (
  "id" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "beneficiaryId" TEXT,
  "programId" TEXT,
  "workshopId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MentorAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationAuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN "programId" TEXT;

CREATE UNIQUE INDEX "Beneficiary_userId_key" ON "Beneficiary"("userId");
CREATE UNIQUE INDEX "ProgramEnrollment_beneficiaryId_programId_key" ON "ProgramEnrollment"("beneficiaryId", "programId");
CREATE UNIQUE INDEX "BeneficiaryProject_beneficiaryId_projectId_key" ON "BeneficiaryProject"("beneficiaryId", "projectId");
CREATE UNIQUE INDEX "WorkshopEnrollment_workshopId_beneficiaryId_key" ON "WorkshopEnrollment"("workshopId", "beneficiaryId");
CREATE INDEX "Project_programId_idx" ON "Project"("programId");
CREATE INDEX "Program_workspaceId_idx" ON "Program"("workspaceId");
CREATE INDEX "Program_ownerId_idx" ON "Program"("ownerId");
CREATE INDEX "Program_visibility_idx" ON "Program"("visibility");
CREATE INDEX "Beneficiary_organizationId_idx" ON "Beneficiary"("organizationId");
CREATE INDEX "Beneficiary_assignedMentorId_idx" ON "Beneficiary"("assignedMentorId");
CREATE INDEX "Beneficiary_programStatus_idx" ON "Beneficiary"("programStatus");
CREATE INDEX "ProgramEnrollment_programId_idx" ON "ProgramEnrollment"("programId");
CREATE INDEX "ProgramEnrollment_assignedMentorId_idx" ON "ProgramEnrollment"("assignedMentorId");
CREATE INDEX "BeneficiaryProject_projectId_idx" ON "BeneficiaryProject"("projectId");
CREATE INDEX "Workshop_programId_idx" ON "Workshop"("programId");
CREATE INDEX "Workshop_instructorId_idx" ON "Workshop"("instructorId");
CREATE INDEX "Workshop_startTime_idx" ON "Workshop"("startTime");
CREATE INDEX "Workshop_visibility_idx" ON "Workshop"("visibility");
CREATE INDEX "WorkshopEnrollment_beneficiaryId_idx" ON "WorkshopEnrollment"("beneficiaryId");
CREATE INDEX "WorkshopEnrollment_userId_idx" ON "WorkshopEnrollment"("userId");
CREATE INDEX "MentorAssignment_mentorId_idx" ON "MentorAssignment"("mentorId");
CREATE INDEX "MentorAssignment_beneficiaryId_idx" ON "MentorAssignment"("beneficiaryId");
CREATE INDEX "MentorAssignment_programId_idx" ON "MentorAssignment"("programId");
CREATE INDEX "MentorAssignment_workshopId_idx" ON "MentorAssignment"("workshopId");
CREATE INDEX "OrganizationAuditLog_organizationId_idx" ON "OrganizationAuditLog"("organizationId");
CREATE INDEX "OrganizationAuditLog_actorId_idx" ON "OrganizationAuditLog"("actorId");
CREATE INDEX "OrganizationAuditLog_entityType_entityId_idx" ON "OrganizationAuditLog"("entityType", "entityId");
CREATE INDEX "OrganizationAuditLog_timestamp_idx" ON "OrganizationAuditLog"("timestamp");

ALTER TABLE "Project" ADD CONSTRAINT "Project_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_assignedMentorId_fkey" FOREIGN KEY ("assignedMentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_assignedMentorId_fkey" FOREIGN KEY ("assignedMentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BeneficiaryProject" ADD CONSTRAINT "BeneficiaryProject_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeneficiaryProject" ADD CONSTRAINT "BeneficiaryProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopEnrollment" ADD CONSTRAINT "WorkshopEnrollment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEnrollment" ADD CONSTRAINT "WorkshopEnrollment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEnrollment" ADD CONSTRAINT "WorkshopEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
