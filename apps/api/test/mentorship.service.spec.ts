import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MentorshipApplicationStatus, MentorshipAttendanceStatus, MentorshipMatchStatus, MentorshipMeetingMode, MentorshipParticipantRole, MentorshipParticipantStatus, MentorshipResourceAssignmentStatus, MentorshipResourceType, MentorshipServiceHourStatus, MentorshipSessionStatus, MentorshipStipendStatus, UserRole, UserStatus } from "@prisma/client";
import { MentorshipService } from "../src/modules/mentorship/mentorship.service";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("MentorshipService program and cohort configuration", () => {
  const program = { id: "program-1", organizationId: "org-1", name: "College Mentorship", code: "CSMP", status: "DRAFT", applicationsEnabled: true, cohorts: [], organization: { supportEmail: "support@example.test" } };
  const cohort = { id: "cohort-1", programId: program.id, name: "Fall 2027", code: "FALL27", status: "DRAFT", maximumMentors: 20, maximumMentees: 50, waitlistEnabled: true, programStartDate: new Date("2027-09-01T12:00:00.000Z"), programEndDate: new Date("2027-12-15T12:00:00.000Z") };
  const match = {
    id: "match-1", programId: program.id, cohortId: cohort.id, menteeParticipantId: "mentee-1", providerParticipantId: "provider-1", status: MentorshipMatchStatus.PROPOSED,
    mentee: { id: "mentee-1", applicationId: "mentee-application", role: MentorshipParticipantRole.MENTEE, application: { firstName: "Nadia", lastName: "Joseph", email: "nadia@example.test" } },
    provider: { id: "provider-1", applicationId: "provider-application", role: MentorshipParticipantRole.MENTOR, application: { firstName: "Jean", lastName: "Pierre", email: "jean@example.test" } }
  };
  const application = { id: "application-1", programId: program.id, cohortId: cohort.id, applicantUserId: null, role: MentorshipParticipantRole.MENTOR, status: MentorshipApplicationStatus.SUBMITTED, firstName: "Jean", lastName: "Pierre", email: "jean@example.test", timeZone: "America/New_York", languages: ["English"], expertise: { Cybersecurity: "Advanced" }, mentoringCapabilities: ["Career exploration"], supportNeeds: [], goals: null };
  const invitedUser = { id: "user-1", email: application.email, status: UserStatus.INVITED, role: UserRole.VOLUNTEER, isActive: false };
  const relationship = { id: "relationship-1", programId: program.id, cohortId: cohort.id, status: "ACTIVE", cohort, mentee: match.mentee, provider: match.provider };
  const scheduledSession = { id: "session-1", relationshipId: relationship.id, status: MentorshipSessionStatus.SCHEDULED, providerAttendance: MentorshipAttendanceStatus.PENDING, menteeAttendance: MentorshipAttendanceStatus.PENDING, scheduledStart: new Date("2027-10-01T14:00:00.000Z"), scheduledEnd: new Date("2027-10-01T15:00:00.000Z"), completedMinutes: 0, notes: null };
  const prisma = {
    organization: { findUnique: jest.fn().mockResolvedValue({ id: "org-1", enabledAddOns: ["MENTORSHIP"] }) },
    mentorshipProgram: {
      create: jest.fn().mockResolvedValue(program),
      findFirst: jest.fn().mockResolvedValue(program),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([program]),
      update: jest.fn().mockResolvedValue(program),
      delete: jest.fn().mockResolvedValue(program)
    },
    mentorshipCohort: {
      create: jest.fn().mockResolvedValue(cohort),
      findFirst: jest.fn().mockResolvedValue(cohort),
      update: jest.fn().mockResolvedValue(cohort)
    },
    mentorshipApplication: {
      create: jest.fn().mockResolvedValue(application),
      findFirst: jest.fn().mockResolvedValue(application),
      update: jest.fn().mockResolvedValue({ ...application, status: MentorshipApplicationStatus.APPROVED, applicantUserId: invitedUser.id }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(invitedUser), update: jest.fn() },
    mentorshipAccountInvitation: { findUnique: jest.fn(), upsert: jest.fn().mockResolvedValue({ id: "invitation-1" }), update: jest.fn() },
    mentorshipParticipant: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({ id: "participant-1" }),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 2 })
    },
    mentorshipEmailOutbox: { create: jest.fn().mockResolvedValue({ id: "email-1" }) },
    mentorshipMatch: { findFirst: jest.fn().mockResolvedValue(match), findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({ ...match, status: MentorshipMatchStatus.APPROVED }), upsert: jest.fn().mockResolvedValue(match) },
    mentorshipRelationship: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue({ id: "relationship-1" }), update: jest.fn().mockResolvedValue({ ...relationship, status: "ENDED" }) },
    mentorshipGoal: { findFirst: jest.fn() },
    mentorshipSession: { findFirst: jest.fn().mockResolvedValue(scheduledSession), update: jest.fn().mockResolvedValue({ ...scheduledSession, status: MentorshipSessionStatus.COMPLETED, providerAttendance: MentorshipAttendanceStatus.ATTENDED, menteeAttendance: MentorshipAttendanceStatus.ATTENDED, completedMinutes: 60, notes: "Reviewed goals" }) },
    mentorshipProgressUpdate: { create: jest.fn() },
    mentorshipServiceHour: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    mentorshipStipendDecision: { upsert: jest.fn() },
    mentorshipResource: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    mentorshipResourceAssignment: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    organizationAuditLog: { create: jest.fn().mockResolvedValue({}) }
  };
  const service = new MentorshipService(prisma as unknown as PrismaService, { get: jest.fn() } as unknown as ConfigService);
  const user = { sub: "admin-1", email: "admin@example.test", role: UserRole.SUPER_ADMIN };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (operation: ((transaction: typeof prisma) => unknown) | Promise<unknown>[]) => Array.isArray(operation) ? Promise.all(operation) : operation(prisma));
  });

  it("creates a Mentorship-owned program and records an audit event", async () => {
    await expect(service.createProgram({ organizationId: "org-1", name: "College Mentorship", code: "csmp", programType: "Academic Mentorship", timeZone: "America/New_York" }, user)).resolves.toBe(program);
    expect(prisma.mentorshipProgram.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ code: "CSMP", organizationId: "org-1" }) }));
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.program.created", entityId: program.id }) }));
  });

  it("creates a cohort with mandatory administrative match approval", async () => {
    await expect(service.createCohort(program.id, { name: "Fall 2027", code: "fall27", programStartDate: "2027-09-01T12:00:00.000Z", programEndDate: "2027-12-15T12:00:00.000Z" }, user)).resolves.toBe(cohort);
    expect(prisma.mentorshipCohort.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: "FALL27", adminApprovalRequired: true }) });
  });

  it("rejects invalid capacity, dates, and matching weights", async () => {
    await expect(service.createCohort(program.id, { name: "Invalid", code: "INVALID", programStartDate: "2027-12-15T12:00:00.000Z", programEndDate: "2027-09-01T12:00:00.000Z", targetMentors: 10, maximumMentors: 5, matchingWeights: { academicAlignment: 99 } }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipCohort.create).not.toHaveBeenCalled();
  });

  it("creates a submitted mentor application with structured matching data", async () => {
    await expect(service.createApplication(program.id, { cohortId: cohort.id, role: MentorshipParticipantRole.MENTOR, firstName: "Jean", lastName: "Pierre", email: "JEAN@example.test", timeZone: "America/New_York", languages: ["English"], expertise: { Cybersecurity: "Advanced" }, submit: true }, user)).resolves.toBe(application);
    expect(prisma.mentorshipApplication.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "jean@example.test", status: MentorshipApplicationStatus.SUBMITTED, role: MentorshipParticipantRole.MENTOR }) }));
  });

  it("creates a tutor application as a role distinct from mentor", async () => {
    await expect(service.createApplication(program.id, { cohortId: cohort.id, role: MentorshipParticipantRole.TUTOR, firstName: "Marie", lastName: "Louis", email: "MARIE@example.test", timeZone: "America/New_York", languages: ["English"], expertise: { Mathematics: "Advanced" }, mentoringCapabilities: ["Algebra tutoring"], submit: true }, user)).resolves.toBe(application);
    expect(prisma.mentorshipApplication.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "marie@example.test", status: MentorshipApplicationStatus.SUBMITTED, role: MentorshipParticipantRole.TUTOR }) }));
  });

  it("creates a matching-pool participant only after the correct admin decision", async () => {
    await service.reviewApplication(program.id, application.id, { decision: MentorshipApplicationStatus.APPROVED, notes: "Eligible mentor" }, user);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: application.email, role: UserRole.VOLUNTEER, status: UserStatus.INVITED, isActive: false }) }));
    expect(prisma.mentorshipApplication.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ applicantUserId: invitedUser.id }) }));
    expect(prisma.mentorshipParticipant.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ applicationId: application.id, userId: invitedUser.id, availableForMatch: true, role: MentorshipParticipantRole.MENTOR }) }));
    expect(prisma.mentorshipAccountInvitation.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ applicationId: application.id, userId: invitedUser.id, programId: program.id }) }));
    expect(prisma.mentorshipEmailOutbox.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipient: application.email, applicationId: application.id, body: expect.stringContaining("/activate/") }) }));
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.application.reviewed" }) }));
  });

  it("links an approved application to an existing active account without creating an invitation", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...invitedUser, status: UserStatus.ACTIVE, isActive: true });
    await service.reviewApplication(program.id, application.id, { decision: MentorshipApplicationStatus.APPROVED }, user);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.mentorshipParticipant.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ userId: invitedUser.id }) }));
    expect(prisma.mentorshipAccountInvitation.upsert).not.toHaveBeenCalled();
    expect(prisma.mentorshipEmailOutbox.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ body: expect.stringContaining("existing Pilye account") }) }));
  });

  it("permanently deletes a program only after exact confirmation", async () => {
    prisma.mentorshipProgram.findUnique.mockResolvedValueOnce({ ...program, _count: { cohorts: 1, applications: 3, participants: 3, relationships: 1, resources: 2 } });
    await service.deleteProgramPermanently(program.id, "DELETE CSMP", user);
    expect(prisma.mentorshipProgram.delete).toHaveBeenCalledWith({ where: { id: program.id } });
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.program.permanently_deleted" }) }));
  });

  it("refuses permanent deletion when the confirmation does not match", async () => {
    prisma.mentorshipProgram.findUnique.mockResolvedValueOnce({ ...program, _count: { cohorts: 1, applications: 3, participants: 3, relationships: 1, resources: 2 } });
    await expect(service.deleteProgramPermanently(program.id, "DELETE WRONG", user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipProgram.delete).not.toHaveBeenCalled();
  });

  it("rejects a mentee eligibility decision for a mentor application", async () => {
    await expect(service.reviewApplication(program.id, application.id, { decision: MentorshipApplicationStatus.ELIGIBLE }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipParticipant.upsert).not.toHaveBeenCalled();
  });

  it("creates a formal active relationship when an administrator approves a match", async () => {
    await service.decideMatch(program.id, match.id, { decision: MentorshipMatchStatus.APPROVED }, user);
    expect(prisma.mentorshipRelationship.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ provider: { role: MentorshipParticipantRole.MENTOR } }) });
    expect(prisma.mentorshipRelationship.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ matchId: match.id, menteeParticipantId: "mentee-1", providerParticipantId: "provider-1", status: "ACTIVE" }) }));
    expect(prisma.mentorshipParticipant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "ACTIVE" } }));
    expect(prisma.mentorshipEmailOutbox.create).toHaveBeenCalledTimes(2);
  });

  it("blocks a second active provider of the same role for a mentee", async () => {
    prisma.mentorshipRelationship.findFirst.mockResolvedValueOnce(relationship);
    await expect(service.decideMatch(program.id, match.id, { decision: MentorshipMatchStatus.APPROVED }, user)).rejects.toThrow("This mentee already has an active mentor relationship in the cohort.");
    expect(prisma.mentorshipRelationship.upsert).not.toHaveBeenCalled();
  });

  it("keeps decided matches intact when regenerating recommendations for active participants", async () => {
    prisma.mentorshipCohort.findFirst.mockResolvedValueOnce({ ...cohort, matchingEnabled: true, recommendationCount: 5 });
    prisma.mentorshipParticipant.findMany.mockResolvedValueOnce([
      { ...match.mentee, status: MentorshipParticipantStatus.ACTIVE, availableForMatch: true, application: { ...match.mentee.application, languages: ["English"], meetingMode: MentorshipMeetingMode.VIRTUAL, careerInterests: ["Technology"], supportNeeds: [] } },
      { ...match.provider, status: MentorshipParticipantStatus.ACTIVE, availableForMatch: true, application: { ...match.provider.application, languages: ["English"], meetingMode: MentorshipMeetingMode.VIRTUAL, expertise: { Technology: "Advanced" }, mentoringCapabilities: ["Technology"] } }
    ]);
    await service.generateMatches(program.id, cohort.id, user);
    expect(prisma.mentorshipParticipant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: [MentorshipParticipantStatus.MATCHING_POOL, MentorshipParticipantStatus.ACTIVE] } }) }));
    expect(prisma.mentorshipMatch.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.not.objectContaining({ status: expect.anything() }) }));
  });

  it("ends the active relationship when an administrator reverses an approved match", async () => {
    prisma.mentorshipMatch.findFirst.mockResolvedValueOnce({ ...match, status: MentorshipMatchStatus.APPROVED, relationship });
    await service.decideMatch(program.id, match.id, { decision: MentorshipMatchStatus.REJECTED, notes: "Reassigned by the program team" }, user);
    expect(prisma.mentorshipRelationship.update).toHaveBeenCalledWith({ where: { id: relationship.id }, data: { status: "ENDED", endDate: expect.any(Date) } });
    expect(prisma.mentorshipParticipant.update).toHaveBeenCalledTimes(2);
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ previousDecision: MentorshipMatchStatus.APPROVED, decision: MentorshipMatchStatus.REJECTED }) }) }));
  });

  it("requires attendance for both people before completing a mentorship session", async () => {
    prisma.mentorshipRelationship.findFirst.mockResolvedValueOnce(relationship);
    await expect(service.updateSession(program.id, relationship.id, scheduledSession.id, { status: MentorshipSessionStatus.COMPLETED }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipSession.update).not.toHaveBeenCalled();
  });

  it("records actual session time and notes when a session is completed", async () => {
    prisma.mentorshipRelationship.findFirst.mockResolvedValueOnce(relationship);
    await service.updateSession(program.id, relationship.id, scheduledSession.id, { status: MentorshipSessionStatus.COMPLETED, providerAttendance: MentorshipAttendanceStatus.ATTENDED, menteeAttendance: MentorshipAttendanceStatus.ATTENDED, notes: "Reviewed goals" }, user);
    expect(prisma.mentorshipSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: MentorshipSessionStatus.COMPLETED, completedMinutes: 60, notes: "Reviewed goals" }) }));
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.session.updated" }) }));
  });

  it("calculates completion, attendance, goal progress, overdue sessions, and inactivity", async () => {
    const oldDate = new Date("2025-01-01T12:00:00.000Z");
    prisma.mentorshipRelationship.findMany.mockResolvedValueOnce([{
      ...relationship,
      updatedAt: oldDate,
      cohort: { ...cohort, minimumSessions: 1, expectedHours: 1 },
      goals: [
        { status: "IN_PROGRESS", progressPercent: 50, updatedAt: oldDate },
        { status: "COMPLETED", progressPercent: 100, updatedAt: oldDate }
      ],
      sessions: [
        { status: MentorshipSessionStatus.COMPLETED, scheduledEnd: oldDate, completedMinutes: 60, providerAttendance: MentorshipAttendanceStatus.ATTENDED, menteeAttendance: MentorshipAttendanceStatus.ATTENDED, updatedAt: oldDate },
        { status: MentorshipSessionStatus.SCHEDULED, scheduledEnd: oldDate, completedMinutes: 0, providerAttendance: MentorshipAttendanceStatus.PENDING, menteeAttendance: MentorshipAttendanceStatus.PENDING, updatedAt: oldDate }
      ],
      progressUpdates: [],
      serviceHours: [{ status: MentorshipServiceHourStatus.APPROVED, minutes: 60 }]
    }]);

    const report = await service.getMonitoringReport(program.id);
    expect(report.summary).toEqual(expect.objectContaining({ relationships: 1, completionRate: 100, completedHours: 1, attendanceRate: 100, goalProgressPercent: 75, overdueSessions: 1, inactiveRelationships: 1 }));
    expect(report.relationships[0]).toEqual(expect.objectContaining({ targetComplete: true, inactive: true, overdueSessions: 1 }));
  });

  it("updates only the signed-in participant's availability", async () => {
    const participant = { id: "participant-1", applicationId: application.id, availableForMatch: true, program: { organization: { id: "org-1" } } };
    prisma.mentorshipParticipant.findFirst.mockResolvedValueOnce(participant);
    prisma.mentorshipApplication.update.mockResolvedValueOnce({ ...application, meetingMode: "HYBRID", hoursPerWeek: 4 });
    prisma.mentorshipParticipant.update.mockResolvedValueOnce({ ...participant, availableForMatch: false });

    await service.updatePortalAvailability({ participantId: participant.id, availability: { days: ["Saturday"] }, meetingMode: MentorshipMeetingMode.HYBRID, hoursPerWeek: 4, availableForMatch: false }, user);

    expect(prisma.mentorshipParticipant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: participant.id, OR: expect.any(Array) }) }));
    expect(prisma.mentorshipParticipant.update).toHaveBeenCalledWith({ where: { id: participant.id }, data: { availableForMatch: false } });
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.portal.availability_updated" }) }));
  });

  it("does not expose another participant's self-service record", async () => {
    prisma.mentorshipParticipant.findFirst.mockResolvedValueOnce(null);
    await expect(service.updatePortalAvailability({ participantId: "someone-else", availability: {} }, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.mentorshipApplication.update).not.toHaveBeenCalled();
  });

  it("allows a linked participant to reschedule their own future session", async () => {
    const futureStart = new Date(Date.now() + 86_400_000);
    const futureEnd = new Date(futureStart.getTime() + 3_600_000);
    prisma.mentorshipParticipant.findMany.mockResolvedValueOnce([{ id: "participant-1" }]);
    prisma.mentorshipSession.findFirst.mockResolvedValueOnce({ ...scheduledSession, relationship: { program: { organizationId: "org-1", organization: { id: "org-1", enabledAddOns: ["MENTORSHIP"] } } } });
    prisma.mentorshipSession.update.mockResolvedValueOnce({ ...scheduledSession, scheduledStart: futureStart, scheduledEnd: futureEnd });

    await service.reschedulePortalSession(scheduledSession.id, { scheduledStart: futureStart.toISOString(), scheduledEnd: futureEnd.toISOString(), reason: "Schedule conflict" }, user);

    expect(prisma.mentorshipSession.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: scheduledSession.id }, data: expect.objectContaining({ scheduledStart: futureStart, scheduledEnd: futureEnd }) }));
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.portal.session_rescheduled" }) }));
  });

  it("creates an auditable shared mentorship resource", async () => {
    const resource = { id: "resource-1", programId: program.id, type: MentorshipResourceType.VIDEO, title: "Study planning", url: "https://example.test/study", tags: ["planning"] };
    prisma.mentorshipResource.create.mockResolvedValueOnce(resource);

    await expect(service.createResource(program.id, { title: resource.title, type: resource.type, url: resource.url, tags: resource.tags }, user)).resolves.toBe(resource);

    expect(prisma.mentorshipResource.create).toHaveBeenCalledWith({ data: expect.objectContaining({ programId: program.id, createdById: user.sub, title: resource.title, tags: ["planning"] }) });
    expect(prisma.organizationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "mentorship.resource.created" }) }));
  });

  it("rejects resource assignment to someone outside the selected relationship", async () => {
    const resource = { id: "resource-1", programId: program.id, archivedAt: null };
    prisma.mentorshipResource.findFirst.mockResolvedValueOnce(resource);
    prisma.mentorshipRelationship.findFirst.mockResolvedValueOnce({ ...relationship, menteeParticipantId: "mentee-1", providerParticipantId: "provider-1" });

    await expect(service.assignResource(program.id, resource.id, { relationshipId: relationship.id, assigneeParticipantIds: ["outsider-1"] }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipResourceAssignment.create).not.toHaveBeenCalled();
  });

  it("lets a participant complete only their own assigned resource", async () => {
    const assignment = { id: "assignment-1", resource: { program: { organizationId: "org-1" } } };
    prisma.mentorshipResourceAssignment.findFirst.mockResolvedValueOnce(assignment);
    prisma.mentorshipResourceAssignment.update.mockResolvedValueOnce({ ...assignment, status: MentorshipResourceAssignmentStatus.COMPLETED, completedAt: expect.any(Date) });

    await service.updatePortalResourceAssignment(assignment.id, { status: MentorshipResourceAssignmentStatus.COMPLETED, completionNotes: "Finished" }, user);

    expect(prisma.mentorshipResourceAssignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: assignment.id, assignee: expect.objectContaining({ OR: expect.any(Array) }) }) }));
    expect(prisma.mentorshipResourceAssignment.update).toHaveBeenCalledWith({ where: { id: assignment.id }, data: expect.objectContaining({ status: MentorshipResourceAssignmentStatus.COMPLETED, completedAt: expect.any(Date) }) });
  });

  it("does not allow a mentee to submit service hours", async () => {
    prisma.mentorshipParticipant.findFirst.mockResolvedValueOnce({ id: "mentee-1", role: MentorshipParticipantRole.MENTEE, programId: program.id, cohortId: cohort.id, program: { organization: { id: "org-1" } } });

    await expect(service.createPortalServiceHour({ participantId: "mentee-1", relationshipId: relationship.id, serviceDate: "2027-10-01", minutes: 60, activity: "Peer support" }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipServiceHour.create).not.toHaveBeenCalled();
  });

  it("requires enough approved hours before an eligible stipend decision", async () => {
    prisma.mentorshipParticipant.findFirst.mockResolvedValueOnce({ id: "provider-1", programId: program.id, cohortId: cohort.id, cohort: { ...cohort, stipendEnabled: true, expectedHours: 20 }, serviceHours: [{ minutes: 60 }] });
    prisma.mentorshipProgram.findFirst.mockResolvedValueOnce({ ...program, stipendsEnabled: true });

    await expect(service.updateStipendDecision(program.id, "provider-1", { status: MentorshipStipendStatus.ELIGIBLE }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mentorshipStipendDecision.upsert).not.toHaveBeenCalled();
  });
});
