import {
  MentorshipApplicationSource,
  MentorshipApplicationStatus,
  MentorshipAssignmentStatus,
  MentorshipAttendanceStatus,
  MentorshipCohortStatus,
  MentorshipGoalStatus,
  MentorshipMatchStatus,
  MentorshipMeetingMode,
  MentorshipNoteVisibility,
  MentorshipParticipantRole,
  MentorshipParticipantStatus,
  MentorshipProgramStatus,
  MentorshipResourceAssignmentStatus,
  MentorshipResourceType,
  MentorshipServiceHourStatus,
  MentorshipSessionStatus,
  PrismaClient,
  UserRole,
  UserStatus
} from "@prisma/client";
import * as argon2 from "argon2";
import { loadBootstrapEnvironment } from "./bootstrap-admin";

const prisma = new PrismaClient();
const { password: adminPassword } = loadBootstrapEnvironment();

const qaPeople = [
  { key: "mentor", email: "mentor.qa@pilye.local", firstName: "Jean", lastName: "Mentor", userRole: UserRole.VOLUNTEER, participantRole: MentorshipParticipantRole.MENTOR },
  { key: "tutor", email: "tutor.qa@pilye.local", firstName: "Marie", lastName: "Tutor", userRole: UserRole.VOLUNTEER, participantRole: MentorshipParticipantRole.TUTOR },
  { key: "mentee", email: "mentee.qa@pilye.local", firstName: "Nadia", lastName: "Mentee", userRole: UserRole.BENEFICIARY, participantRole: MentorshipParticipantRole.MENTEE }
] as const;

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, isActive: true } });
  if (!admin) throw new Error("Run the staging bootstrap before the Pilye QA seed.");
  const organization = await prisma.organization.findUnique({ where: { slug: "nextgen-haitian-empowerment" } });
  if (!organization) throw new Error("The staging organization is missing. Run the bootstrap first.");
  await prisma.organization.update({ where: { id: organization.id }, data: { enabledAddOns: [...new Set([...organization.enabledAddOns, "MENTORSHIP"])] } });

  const password = await argon2.hash(adminPassword);
  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>();
  for (const person of qaPeople) {
    users.set(person.key, await prisma.user.upsert({
      where: { email: person.email },
      update: { firstName: person.firstName, lastName: person.lastName, role: person.userRole, status: UserStatus.ACTIVE, isActive: true, password },
      create: { email: person.email, firstName: person.firstName, lastName: person.lastName, role: person.userRole, status: UserStatus.ACTIVE, isActive: true, password }
    }));
  }

  const now = new Date();
  const programStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const programEndDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const program = await prisma.mentorshipProgram.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "PILYE-QA" } },
    update: { ownerId: admin.id, status: MentorshipProgramStatus.ACTIVE, applicationsEnabled: true, matchingEnabled: true },
    create: { organizationId: organization.id, ownerId: admin.id, name: "Pilye Staging QA", code: "PILYE-QA", description: "Isolated acceptance-test data for mentor and tutor classrooms.", status: MentorshipProgramStatus.ACTIVE, programType: "Mentorship QA", defaultMeetingMode: MentorshipMeetingMode.VIRTUAL, timeZone: "America/New_York", applicationsEnabled: true, matchingEnabled: true }
  });
  const cohort = await prisma.mentorshipCohort.upsert({
    where: { programId_code: { programId: program.id, code: "QA-COHORT" } },
    update: { status: MentorshipCohortStatus.ACTIVE, programStartDate, programEndDate },
    create: { programId: program.id, name: "QA Cohort", code: "QA-COHORT", status: MentorshipCohortStatus.ACTIVE, programStartDate, programEndDate, mentorEligibility: {}, tutorEligibility: {}, menteeEligibility: {}, minimumSessions: 4, expectedHours: 4, matchingEnabled: true, adminApprovalRequired: true, matchingWeights: { academicAlignment: 25, supportNeeds: 20, careerAlignment: 15, scheduleOverlap: 15, language: 10, background: 10, otherPreferences: 5 } }
  });

  const participants = new Map<string, Awaited<ReturnType<typeof prisma.mentorshipParticipant.upsert>>>();
  for (const person of qaPeople) {
    const user = users.get(person.key)!;
    const application = await prisma.mentorshipApplication.upsert({
      where: { cohortId_email_role: { cohortId: cohort.id, email: person.email, role: person.participantRole } },
      update: { applicantUserId: user.id, reviewedById: admin.id, status: MentorshipApplicationStatus.APPROVED, reviewedAt: now },
      create: { programId: program.id, cohortId: cohort.id, applicantUserId: user.id, reviewedById: admin.id, role: person.participantRole, source: MentorshipApplicationSource.ADMIN_CREATED, status: MentorshipApplicationStatus.APPROVED, firstName: person.firstName, lastName: person.lastName, email: person.email, timeZone: "America/New_York", languages: ["English", "Haitian Creole"], disciplines: person.participantRole === MentorshipParticipantRole.TUTOR ? ["Mathematics"] : [], expertise: person.participantRole === MentorshipParticipantRole.MENTOR ? { Technology: "Advanced" } : person.participantRole === MentorshipParticipantRole.TUTOR ? { Mathematics: "Advanced" } : {}, mentoringCapabilities: person.participantRole === MentorshipParticipantRole.MENTEE ? [] : ["Goal planning", "Academic support"], supportNeeds: person.participantRole === MentorshipParticipantRole.MENTEE ? ["Career planning", "Algebra"] : [], careerInterests: person.participantRole === MentorshipParticipantRole.MENTEE ? ["Technology"] : [], availability: { days: ["Tuesday", "Saturday"], times: ["18:00"] }, meetingMode: MentorshipMeetingMode.VIRTUAL, hoursPerWeek: 2, consentItems: { qaData: true }, submittedAt: now, reviewedAt: now }
    });
    participants.set(person.key, await prisma.mentorshipParticipant.upsert({
      where: { applicationId: application.id },
      update: { userId: user.id, status: MentorshipParticipantStatus.ACTIVE, availableForMatch: true },
      create: { applicationId: application.id, programId: program.id, cohortId: cohort.id, userId: user.id, role: person.participantRole, status: MentorshipParticipantStatus.ACTIVE, availableForMatch: true }
    }));
  }

  const mentorRelationship = await ensureRelationship(program.id, cohort.id, participants.get("mentee")!.id, participants.get("mentor")!.id, admin.id, programStartDate, programEndDate);
  const tutorRelationship = await ensureRelationship(program.id, cohort.id, participants.get("mentee")!.id, participants.get("tutor")!.id, admin.id, programStartDate, programEndDate);
  await seedClassroom(mentorRelationship.id, participants.get("mentee")!.id, participants.get("mentor")!.id, admin.id, "Career roadmap", "Prepare three questions for a technology mentor", "Career exploration guide", "https://example.org/pilye/qa/career");
  await seedClassroom(tutorRelationship.id, participants.get("mentee")!.id, participants.get("tutor")!.id, admin.id, "Algebra confidence", "Complete the practice worksheet", "Algebra practice guide", "https://example.org/pilye/qa/algebra");

  for (const [key, relationship] of [["mentor", mentorRelationship], ["tutor", tutorRelationship]] as const) {
    const participant = participants.get(key)!;
    const existing = await prisma.mentorshipServiceHour.findFirst({ where: { relationshipId: relationship.id, participantId: participant.id, activity: "QA completed session" } });
    if (!existing) await prisma.mentorshipServiceHour.create({ data: { programId: program.id, cohortId: cohort.id, participantId: participant.id, relationshipId: relationship.id, submittedById: users.get(key)!.id, reviewedById: admin.id, serviceDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), minutes: 60, activity: "QA completed session", description: "Verified staging service time.", status: MentorshipServiceHourStatus.APPROVED, reviewedAt: now } });
  }

  console.log(JSON.stringify({ program: program.code, cohort: cohort.code, classrooms: 2, accounts: qaPeople.map(({ email, participantRole }) => ({ email, role: participantRole })), passwordSource: "ADMIN_PASSWORD" }, null, 2));
}

async function ensureRelationship(programId: string, cohortId: string, menteeParticipantId: string, providerParticipantId: string, approvedById: string, startDate: Date, endDate: Date) {
  const match = await prisma.mentorshipMatch.upsert({
    where: { cohortId_menteeParticipantId_providerParticipantId: { cohortId, menteeParticipantId, providerParticipantId } },
    update: { status: MentorshipMatchStatus.APPROVED, approvedById, approvedAt: new Date(), score: 95 },
    create: { programId, cohortId, menteeParticipantId, providerParticipantId, status: MentorshipMatchStatus.APPROVED, score: 95, scoreBreakdown: { qa: 95 }, approvedById, approvedAt: new Date() }
  });
  return prisma.mentorshipRelationship.upsert({ where: { matchId: match.id }, update: { status: "ACTIVE", startDate, endDate }, create: { matchId: match.id, programId, cohortId, menteeParticipantId, providerParticipantId, status: "ACTIVE", startDate, endDate } });
}

async function seedClassroom(relationshipId: string, menteeParticipantId: string, providerParticipantId: string, adminId: string, goalTitle: string, assignmentTitle: string, resourceTitle: string, resourceUrl: string) {
  const now = new Date();
  const goal = await prisma.mentorshipGoal.findFirst({ where: { relationshipId, title: goalTitle } }) ?? await prisma.mentorshipGoal.create({ data: { relationshipId, title: goalTitle, description: "Staging goal used to verify classroom isolation.", status: MentorshipGoalStatus.IN_PROGRESS, progressPercent: 50, targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) } });
  const completedTitle = `${goalTitle} completed session`;
  let completed = await prisma.mentorshipSession.findFirst({ where: { relationshipId, title: completedTitle } });
  if (!completed) completed = await prisma.mentorshipSession.create({ data: { relationshipId, title: completedTitle, scheduledStart: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), scheduledEnd: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), meetingMode: MentorshipMeetingMode.VIRTUAL, videoUrl: "https://meet.example.org/pilye-qa", agenda: "Review the QA learning plan.", notes: "QA session completed successfully.", status: MentorshipSessionStatus.COMPLETED, providerAttendance: MentorshipAttendanceStatus.ATTENDED, menteeAttendance: MentorshipAttendanceStatus.ATTENDED, completedMinutes: 60, createdById: adminId } });
  const upcomingTitle = `${goalTitle} upcoming session`;
  if (!(await prisma.mentorshipSession.findFirst({ where: { relationshipId, title: upcomingTitle } }))) await prisma.mentorshipSession.create({ data: { relationshipId, title: upcomingTitle, scheduledStart: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), scheduledEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), meetingMode: MentorshipMeetingMode.VIRTUAL, videoUrl: "https://meet.example.org/pilye-qa", agenda: "Continue classroom progress.", createdById: adminId } });
  if (!(await prisma.mentorshipAssignment.findFirst({ where: { relationshipId, title: assignmentTitle } }))) await prisma.mentorshipAssignment.create({ data: { relationshipId, sessionId: completed.id, goalId: goal.id, assigneeParticipantId: menteeParticipantId, createdById: adminId, title: assignmentTitle, description: "QA follow-up task scoped to this classroom.", status: MentorshipAssignmentStatus.IN_PROGRESS, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) } });
  if (!(await prisma.mentorshipNote.findFirst({ where: { relationshipId, body: { contains: "QA shared classroom note" } } }))) await prisma.mentorshipNote.create({ data: { relationshipId, authorId: adminId, body: `QA shared classroom note for ${goalTitle}.`, visibility: MentorshipNoteVisibility.SHARED } });
  if (!(await prisma.mentorshipNote.findFirst({ where: { relationshipId, body: { contains: "QA staff-only note" } } }))) await prisma.mentorshipNote.create({ data: { relationshipId, authorId: adminId, body: `QA staff-only note for ${goalTitle}.`, visibility: MentorshipNoteVisibility.STAFF_ONLY } });
  const relationship = await prisma.mentorshipRelationship.findUniqueOrThrow({ where: { id: relationshipId } });
  const resource = await prisma.mentorshipResource.findFirst({ where: { programId: relationship.programId, title: resourceTitle } }) ?? await prisma.mentorshipResource.create({ data: { programId: relationship.programId, createdById: adminId, title: resourceTitle, description: "Staging resource used to verify completion tracking.", type: MentorshipResourceType.LINK, url: resourceUrl, tags: ["qa"] } });
  if (!(await prisma.mentorshipResourceAssignment.findFirst({ where: { resourceId: resource.id, relationshipId, assigneeParticipantId: menteeParticipantId } }))) await prisma.mentorshipResourceAssignment.create({ data: { resourceId: resource.id, relationshipId, goalId: goal.id, assigneeParticipantId: menteeParticipantId, assignedById: adminId, status: MentorshipResourceAssignmentStatus.IN_PROGRESS, dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), notes: "Complete this resource in the selected classroom." } });
  void providerParticipantId;
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
