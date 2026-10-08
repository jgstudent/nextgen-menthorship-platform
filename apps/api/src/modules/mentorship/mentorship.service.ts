import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { MentorshipApplicationSource, MentorshipApplicationStatus, MentorshipAssignmentStatus, MentorshipAttendanceStatus, MentorshipCohortStatus, MentorshipGoalStatus, MentorshipMatchStatus, MentorshipNoteVisibility, MentorshipNotificationType, MentorshipParticipantRole, MentorshipParticipantStatus, MentorshipProgramStatus, MentorshipResourceAssignmentStatus, MentorshipServiceHourStatus, MentorshipSessionStatus, MentorshipStipendStatus, Prisma, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMentorshipCohortDto } from "./dto/create-mentorship-cohort.dto";
import { CreateMentorshipApplicationDto } from "./dto/create-mentorship-application.dto";
import { CreateMentorshipGoalDto } from "./dto/create-mentorship-goal.dto";
import { CreateMentorshipProgressUpdateDto } from "./dto/create-mentorship-progress-update.dto";
import { CreateMentorshipProgramDto } from "./dto/create-mentorship-program.dto";
import { CreateMentorshipSessionDto } from "./dto/create-mentorship-session.dto";
import { CreatePublicMentorshipApplicationDto } from "./dto/create-public-mentorship-application.dto";
import { DecideMentorshipMatchDto } from "./dto/decide-mentorship-match.dto";
import { ReviewMentorshipApplicationDto } from "./dto/review-mentorship-application.dto";
import { UpdateMentorshipApplicationDto } from "./dto/update-mentorship-application.dto";
import { UpdateMentorshipCohortDto } from "./dto/update-mentorship-cohort.dto";
import { UpdateMentorshipGoalDto } from "./dto/update-mentorship-goal.dto";
import { UpdateMentorshipParticipantDto } from "./dto/update-mentorship-participant.dto";
import { UpdateMentorshipProgramDto } from "./dto/update-mentorship-program.dto";
import { UpdateMentorshipSessionDto } from "./dto/update-mentorship-session.dto";
import { CancelPortalSessionDto } from "./dto/cancel-portal-session.dto";
import { CreatePortalFeedbackDto } from "./dto/create-portal-feedback.dto";
import { ReschedulePortalSessionDto } from "./dto/reschedule-portal-session.dto";
import { UpdatePortalAvailabilityDto } from "./dto/update-portal-availability.dto";
import { AssignMentorshipResourceDto } from "./dto/assign-mentorship-resource.dto";
import { CreateMentorshipResourceDto } from "./dto/create-mentorship-resource.dto";
import { UpdateMentorshipResourceDto } from "./dto/update-mentorship-resource.dto";
import { UpdatePortalResourceAssignmentDto } from "./dto/update-portal-resource-assignment.dto";
import { CreatePortalServiceHourDto } from "./dto/create-portal-service-hour.dto";
import { ReviewMentorshipServiceHourDto } from "./dto/review-mentorship-service-hour.dto";
import { UpdateMentorshipStipendDecisionDto } from "./dto/update-mentorship-stipend-decision.dto";
import { CreateMentorshipAssignmentDto } from "./dto/create-mentorship-assignment.dto";
import { UpdateMentorshipAssignmentDto } from "./dto/update-mentorship-assignment.dto";
import { CreateMentorshipNoteDto } from "./dto/create-mentorship-note.dto";
import { CreatePortalNoteDto } from "./dto/create-portal-note.dto";
import { UpdatePortalAssignmentDto } from "./dto/update-portal-assignment.dto";

const defaultMatchingWeights = {
  academicAlignment: 25,
  supportNeeds: 20,
  careerAlignment: 15,
  scheduleOverlap: 15,
  language: 10,
  background: 10,
  otherPreferences: 5
};

function percentage(value: number, total: number) {
  return Math.round((value / total) * 100);
}

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

const programInclude = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  organization: { select: { id: true, name: true, displayName: true, supportEmail: true, logoUrl: true, enabledAddOns: true } },
  cohorts: { orderBy: { programStartDate: "desc" as const } }
};

const applicationInclude = {
  cohort: { select: { id: true, name: true, code: true, status: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  participant: true
};

@Injectable()
export class MentorshipService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  foundation() {
    return { phase: 1, status: "PARTICIPANT_INTAKE", enrollmentOpen: false } as const;
  }

  findPrograms() {
    return this.prisma.mentorshipProgram.findMany({
      where: { status: { not: MentorshipProgramStatus.ARCHIVED }, organization: { enabledAddOns: { has: "MENTORSHIP" } } },
      include: programInclude,
      orderBy: { updatedAt: "desc" }
    });
  }

  async findProgram(id: string) {
    const program = await this.prisma.mentorshipProgram.findFirst({
      where: { id, status: { not: MentorshipProgramStatus.ARCHIVED }, organization: { enabledAddOns: { has: "MENTORSHIP" } } },
      include: programInclude
    });
    if (!program) throw new NotFoundException("Mentorship program not found.");
    return program;
  }

  async createProgram(dto: CreateMentorshipProgramDto, user: AuthenticatedUser) {
    const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true, enabledAddOns: true } });
    if (!organization) throw new BadRequestException("Organization not found.");
    if (!organization.enabledAddOns.includes("MENTORSHIP")) throw new BadRequestException("The Mentorship add-on is not enabled for this organization.");

    const program = await this.prisma.mentorshipProgram.create({
      data: {
        organizationId: dto.organizationId,
        ownerId: dto.ownerId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
        status: dto.status,
        programType: dto.programType.trim(),
        defaultDuration: dto.defaultDuration?.trim(),
        defaultMeetingMode: dto.defaultMeetingMode,
        maximumParticipants: dto.maximumParticipants,
        timeZone: dto.timeZone,
        applicationsEnabled: dto.applicationsEnabled,
        matchingEnabled: dto.matchingEnabled,
        stipendsEnabled: dto.stipendsEnabled,
        publicApplicationsEnabled: dto.publicApplicationsEnabled,
        publicApplicationToken: dto.publicApplicationsEnabled ? randomUUID() : undefined,
        inquiryEmail: dto.inquiryEmail?.trim().toLowerCase(),
        externalProgramId: dto.externalProgramId,
        integrationSource: dto.integrationSource
      },
      include: programInclude
    });
    await this.audit(user, program.organizationId, "mentorship.program.created", "MentorshipProgram", program.id, { name: program.name, code: program.code });
    return program;
  }

  async updateProgram(id: string, dto: UpdateMentorshipProgramDto, user: AuthenticatedUser) {
    const existing = await this.findProgram(id);
    if (dto.organizationId && dto.organizationId !== existing.organizationId) {
      throw new BadRequestException("A mentorship program cannot be moved to another organization.");
    }
    const program = await this.prisma.mentorshipProgram.update({
      where: { id },
      data: {
        ownerId: dto.ownerId,
        name: dto.name?.trim(),
        code: dto.code?.trim().toUpperCase(),
        description: dto.description?.trim(),
        status: dto.status,
        programType: dto.programType?.trim(),
        defaultDuration: dto.defaultDuration?.trim(),
        defaultMeetingMode: dto.defaultMeetingMode,
        maximumParticipants: dto.maximumParticipants,
        timeZone: dto.timeZone,
        applicationsEnabled: dto.applicationsEnabled,
        matchingEnabled: dto.matchingEnabled,
        stipendsEnabled: dto.stipendsEnabled,
        publicApplicationsEnabled: dto.publicApplicationsEnabled,
        publicApplicationToken: dto.publicApplicationsEnabled && !existing.publicApplicationToken ? randomUUID() : undefined,
        inquiryEmail: dto.inquiryEmail?.trim().toLowerCase(),
        externalProgramId: dto.externalProgramId,
        integrationSource: dto.integrationSource
      },
      include: programInclude
    });
    await this.audit(user, program.organizationId, "mentorship.program.updated", "MentorshipProgram", id, { name: program.name, status: program.status });
    return program;
  }

  async archiveProgram(id: string, user: AuthenticatedUser) {
    const existing = await this.findProgram(id);
    const program = await this.prisma.mentorshipProgram.update({ where: { id }, data: { status: MentorshipProgramStatus.ARCHIVED }, include: programInclude });
    await this.audit(user, existing.organizationId, "mentorship.program.archived", "MentorshipProgram", id, { name: existing.name });
    return program;
  }

  async deleteProgramPermanently(id: string, confirmation: string, user: AuthenticatedUser) {
    const program = await this.prisma.mentorshipProgram.findUnique({
      where: { id },
      include: { _count: { select: { cohorts: true, applications: true, participants: true, relationships: true, resources: true } } }
    });
    if (!program) throw new NotFoundException("Mentorship program not found.");
    if (confirmation !== `DELETE ${program.code}`) throw new BadRequestException(`Type DELETE ${program.code} to permanently delete this program.`);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.mentorshipProgram.delete({ where: { id } });
      await transaction.organizationAuditLog.create({ data: { organizationId: program.organizationId, actorId: user.sub, action: "mentorship.program.permanently_deleted", entityType: "MentorshipProgram", entityId: id, metadata: { name: program.name, code: program.code, deletedCounts: program._count } } });
    });
    return { success: true, deletedProgramId: id, deletedCounts: program._count };
  }

  async createCohort(programId: string, dto: CreateMentorshipCohortDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    this.validateCohort(dto);
    const cohort = await this.prisma.mentorshipCohort.create({ data: this.cohortCreateData(programId, dto) });
    await this.audit(user, program.organizationId, "mentorship.cohort.created", "MentorshipCohort", cohort.id, { programId, name: cohort.name, code: cohort.code });
    return cohort;
  }

  async updateCohort(programId: string, cohortId: string, dto: UpdateMentorshipCohortDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.findCohort(programId, cohortId);
    this.validateCohort({
      ...existing,
      ...dto,
      programStartDate: dto.programStartDate ?? existing.programStartDate.toISOString(),
      programEndDate: dto.programEndDate ?? existing.programEndDate.toISOString(),
      applicationOpenDate: this.dateValue(dto.applicationOpenDate, existing.applicationOpenDate),
      applicationCloseDate: this.dateValue(dto.applicationCloseDate, existing.applicationCloseDate),
      mentorApplicationOpenDate: this.dateValue(dto.mentorApplicationOpenDate, existing.mentorApplicationOpenDate),
      mentorApplicationCloseDate: this.dateValue(dto.mentorApplicationCloseDate, existing.mentorApplicationCloseDate),
      menteeApplicationOpenDate: this.dateValue(dto.menteeApplicationOpenDate, existing.menteeApplicationOpenDate),
      menteeApplicationCloseDate: this.dateValue(dto.menteeApplicationCloseDate, existing.menteeApplicationCloseDate)
    });
    const cohort = await this.prisma.mentorshipCohort.update({ where: { id: cohortId }, data: this.cohortUpdateData(dto) });
    await this.audit(user, program.organizationId, "mentorship.cohort.updated", "MentorshipCohort", cohort.id, { programId, name: cohort.name, status: cohort.status });
    return cohort;
  }

  async archiveCohort(programId: string, cohortId: string, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.findCohort(programId, cohortId);
    const cohort = await this.prisma.mentorshipCohort.update({ where: { id: cohortId }, data: { status: MentorshipCohortStatus.ARCHIVED } });
    await this.audit(user, program.organizationId, "mentorship.cohort.archived", "MentorshipCohort", cohort.id, { programId, name: existing.name });
    return cohort;
  }

  async findApplications(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipApplication.findMany({ where: { programId }, include: applicationInclude, orderBy: { updatedAt: "desc" } });
  }

  async findNotifications(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipNotification.findMany({
      where: { programId },
      include: { application: { select: { id: true, firstName: true, lastName: true, role: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async markNotificationRead(programId: string, notificationId: string) {
    await this.findProgram(programId);
    const notification = await this.prisma.mentorshipNotification.findFirst({ where: { id: notificationId, programId } });
    if (!notification) throw new NotFoundException("Mentorship notification not found.");
    return this.prisma.mentorshipNotification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }

  async findPublicProgram(token: string, preview = false) {
    const program = await this.publicProgram(token, preview);
    return {
      organization: { name: program.organization.displayName ?? program.organization.name, logoUrl: program.organization.logoUrl },
      program: { id: program.id, name: program.name, description: program.description, programType: program.programType, timeZone: program.timeZone, defaultMeetingMode: program.defaultMeetingMode },
      cohorts: program.cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, code: cohort.code, programStartDate: cohort.programStartDate, programEndDate: cohort.programEndDate, mentorEligibility: cohort.mentorEligibility, tutorEligibility: cohort.tutorEligibility, menteeEligibility: cohort.menteeEligibility, availableRoles: [MentorshipParticipantRole.MENTOR, MentorshipParticipantRole.TUTOR, MentorshipParticipantRole.MENTEE].filter((role) => preview || this.roleWindowOpen(cohort, role)) }))
    };
  }

  async createPublicApplication(token: string, dto: CreatePublicMentorshipApplicationDto) {
    if (dto.website) throw new BadRequestException("Application could not be submitted.");
    const program = await this.publicProgram(token);
    const cohort = program.cohorts.find((item) => item.id === dto.cohortId);
    if (!cohort || !this.roleWindowOpen(cohort, dto.role)) throw new BadRequestException("The selected cohort is not accepting this application type.");
    this.validateApplication(dto, true);
    const recipient = program.inquiryEmail ?? program.organization.supportEmail;
    const result = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.mentorshipApplication.create({
        data: this.applicationData(program.id, { ...dto, source: MentorshipApplicationSource.SELF_SERVICE, submit: true }, MentorshipApplicationStatus.SUBMITTED),
        include: applicationInclude
      });
      const title = `New ${this.roleLabel(created.role)} application`;
      const message = `${created.firstName} ${created.lastName} submitted an application for ${created.cohort.name}.`;
      await transaction.mentorshipNotification.create({ data: { organizationId: program.organizationId, programId: program.id, applicationId: created.id, title, message } });
      let emailOutboxId: string | undefined;
      if (recipient) {
        const queued = await transaction.mentorshipEmailOutbox.create({
          data: { organizationId: program.organizationId, programId: program.id, applicationId: created.id, recipient, subject: `${title} — ${program.name}`, body: `${message}\n\nReview this application securely in the ${program.organization.displayName ?? program.organization.name} portal.` }
        });
        emailOutboxId = queued.id;
      }
      await transaction.organizationAuditLog.create({ data: { organizationId: program.organizationId, action: "mentorship.public_application.submitted", entityType: "MentorshipApplication", entityId: created.id, metadata: { programId: program.id, cohortId: created.cohortId, role: created.role } } });
      return { application: created, emailOutboxId };
    });
    if (result.emailOutboxId) await this.dispatchEmailOutbox(result.emailOutboxId);
    return { id: result.application.id, status: result.application.status, submittedAt: result.application.submittedAt, programName: program.name };
  }

  async findParticipants(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipParticipant.findMany({
      where: { programId },
      include: { cohort: { select: { id: true, name: true, code: true } }, application: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async createApplication(programId: string, dto: CreateMentorshipApplicationDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    if (!program.applicationsEnabled) throw new BadRequestException("Applications are disabled for this program.");
    await this.findCohort(programId, dto.cohortId);
    this.validateApplication(dto, Boolean(dto.submit));
    const status = dto.submit ? MentorshipApplicationStatus.SUBMITTED : MentorshipApplicationStatus.DRAFT;
    const application = await this.prisma.mentorshipApplication.create({ data: this.applicationData(programId, dto, status), include: applicationInclude });
    await this.audit(user, program.organizationId, "mentorship.application.created", "MentorshipApplication", application.id, { programId, cohortId: dto.cohortId, role: dto.role, status });
    return application;
  }

  async updateApplication(programId: string, applicationId: string, dto: UpdateMentorshipApplicationDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.findApplication(programId, applicationId);
    if (new Set<MentorshipApplicationStatus>([MentorshipApplicationStatus.APPROVED, MentorshipApplicationStatus.ELIGIBLE, MentorshipApplicationStatus.REJECTED, MentorshipApplicationStatus.INELIGIBLE, MentorshipApplicationStatus.WITHDRAWN]).has(existing.status)) {
      throw new BadRequestException("A completed application decision cannot be edited.");
    }
    if (dto.cohortId) await this.findCohort(programId, dto.cohortId);
    const application = await this.prisma.mentorshipApplication.update({ where: { id: applicationId }, data: this.applicationUpdateData(dto), include: applicationInclude });
    await this.audit(user, program.organizationId, "mentorship.application.updated", "MentorshipApplication", application.id, { status: application.status });
    return application;
  }

  async submitApplication(programId: string, applicationId: string, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.findApplication(programId, applicationId);
    if (!new Set<MentorshipApplicationStatus>([MentorshipApplicationStatus.DRAFT, MentorshipApplicationStatus.NEEDS_INFORMATION]).has(existing.status)) {
      throw new BadRequestException("Only draft applications or applications needing information can be submitted.");
    }
    this.validateApplication(existing, true);
    const application = await this.prisma.mentorshipApplication.update({ where: { id: applicationId }, data: { status: MentorshipApplicationStatus.SUBMITTED, submittedAt: new Date() }, include: applicationInclude });
    await this.audit(user, program.organizationId, "mentorship.application.submitted", "MentorshipApplication", application.id, { role: application.role });
    return application;
  }

  async reviewApplication(programId: string, applicationId: string, dto: ReviewMentorshipApplicationDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const application = await this.findApplication(programId, applicationId);
    if (!new Set<MentorshipApplicationStatus>([MentorshipApplicationStatus.SUBMITTED, MentorshipApplicationStatus.UNDER_REVIEW, MentorshipApplicationStatus.NEEDS_INFORMATION]).has(application.status)) {
      throw new BadRequestException("Only submitted applications can be reviewed.");
    }
    this.validateDecision(application.role, dto.decision);
    if (dto.decision === MentorshipApplicationStatus.UNDER_REVIEW) {
      const reviewing = await this.prisma.mentorshipApplication.update({ where: { id: applicationId }, data: { status: dto.decision, reviewedById: user.sub, reviewNotes: dto.notes }, include: applicationInclude });
      await this.audit(user, program.organizationId, "mentorship.application.review_started", "MentorshipApplication", application.id, { role: application.role });
      return reviewing;
    }

    const approved = dto.decision === MentorshipApplicationStatus.APPROVED || dto.decision === MentorshipApplicationStatus.ELIGIBLE;
    let participantStatus: MentorshipParticipantStatus = MentorshipParticipantStatus.MATCHING_POOL;
    let availableForMatch = true;
    if (approved) {
      const cohort = await this.findCohort(programId, application.cohortId);
      const capacity = application.role === MentorshipParticipantRole.MENTOR
        ? cohort.maximumMentors
        : application.role === MentorshipParticipantRole.TUTOR
          ? cohort.maximumTutors
          : cohort.maximumMentees;
      if (capacity !== null) {
        const current = await this.prisma.mentorshipParticipant.count({ where: { cohortId: cohort.id, role: application.role, status: { notIn: [MentorshipParticipantStatus.WITHDRAWN] } } });
        if (current >= capacity) {
          if (!cohort.waitlistEnabled) throw new BadRequestException("Cohort capacity has been reached and the waitlist is disabled.");
          participantStatus = MentorshipParticipantStatus.WAITLISTED;
          availableForMatch = false;
        }
      }
    }

    const invitationToken = approved ? randomBytes(32).toString("base64url") : undefined;
    const invitationTokenHash = invitationToken ? createHash("sha256").update(invitationToken).digest("hex") : undefined;
    const placeholderPassword = approved ? await argon2.hash(randomBytes(32).toString("base64url")) : undefined;
    const result = await this.prisma.$transaction(async (transaction) => {
      const normalizedEmail = application.email.trim().toLowerCase();
      let account = approved ? await transaction.user.findUnique({ where: { email: normalizedEmail } }) : null;
      if (approved && !account) {
        account = await transaction.user.create({
          data: {
            email: normalizedEmail,
            firstName: application.firstName.trim(),
            lastName: application.lastName.trim(),
            password: placeholderPassword!,
            role: application.role === MentorshipParticipantRole.MENTEE ? UserRole.BENEFICIARY : UserRole.VOLUNTEER,
            status: UserStatus.INVITED,
            isActive: false
          }
        });
      }
      const reviewed = await transaction.mentorshipApplication.update({ where: { id: applicationId }, data: { status: dto.decision, reviewedById: user.sub, reviewNotes: dto.notes, reviewedAt: new Date(), applicantUserId: account?.id }, include: applicationInclude });
      if (approved) {
        await transaction.mentorshipParticipant.upsert({
          where: { applicationId },
          create: { applicationId, programId, cohortId: application.cohortId, userId: account?.id, role: application.role, status: participantStatus, availableForMatch },
          update: { userId: account?.id, status: participantStatus, availableForMatch }
        });
      }
      const decisionLabel = dto.decision === MentorshipApplicationStatus.NEEDS_INFORMATION
        ? "More information is needed"
        : approved
          ? "Application accepted"
          : "Application decision";
      const decisionMessage = dto.decision === MentorshipApplicationStatus.NEEDS_INFORMATION
        ? `More information is needed before your ${this.roleLabel(application.role)} application for ${program.name} can be decided.`
        : approved
          ? `Your ${this.roleLabel(application.role)} application for ${program.name} has been accepted${participantStatus === MentorshipParticipantStatus.WAITLISTED ? " and placed on the waitlist" : ""}.`
          : `Your ${this.roleLabel(application.role)} application for ${program.name} was not selected for this cohort.`;
      let activationUrl: string | undefined;
      if (approved && account?.status === UserStatus.INVITED && invitationToken && invitationTokenHash) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await transaction.mentorshipAccountInvitation.upsert({
          where: { applicationId },
          create: { programId, applicationId, userId: account.id, tokenHash: invitationTokenHash, expiresAt },
          update: { userId: account.id, tokenHash: invitationTokenHash, expiresAt, acceptedAt: null }
        });
        const webAppUrl = (this.config.get<string>("WEB_APP_URL") ?? "http://localhost:3100").replace(/\/$/, "");
        activationUrl = `${webAppUrl}/activate/${invitationToken}`;
      }
      const accountInstructions = !approved
        ? ""
        : activationUrl
          ? `\n\nActivate your Pilye account within 7 days:\n${activationUrl}`
          : account?.status === UserStatus.ACTIVE
            ? `\n\nYour application has been linked to your existing Pilye account. Sign in at ${(this.config.get<string>("WEB_APP_URL") ?? "http://localhost:3100").replace(/\/$/, "")}/login.`
            : "\n\nYour application was linked to an existing account. Contact the program team if you cannot sign in.";
      const queued = await transaction.mentorshipEmailOutbox.create({
        data: {
          organizationId: program.organizationId,
          programId: program.id,
          applicationId,
          recipient: application.email,
          subject: `${decisionLabel} — ${program.name}`,
          body: `${decisionMessage}${dto.notes ? `\n\nMessage from the review team:\n${dto.notes}` : ""}${accountInstructions}\n\nPlease contact ${program.organization.supportEmail ?? "the organization"} if you have questions.`
        }
      });
      return { reviewed, emailOutboxId: queued.id };
    });
    await this.audit(user, program.organizationId, "mentorship.application.reviewed", "MentorshipApplication", application.id, { role: application.role, decision: dto.decision, participantStatus: approved ? participantStatus : undefined });
    await this.dispatchEmailOutbox(result.emailOutboxId);
    return result.reviewed;
  }

  async updateParticipant(programId: string, participantId: string, dto: UpdateMentorshipParticipantDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.prisma.mentorshipParticipant.findFirst({ where: { id: participantId, programId } });
    if (!existing) throw new NotFoundException("Mentorship participant not found.");
    const participant = await this.prisma.mentorshipParticipant.update({ where: { id: participantId }, data: dto });
    await this.audit(user, program.organizationId, "mentorship.participant.updated", "MentorshipParticipant", participant.id, { status: participant.status, availableForMatch: participant.availableForMatch });
    return participant;
  }

  async findMatches(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipMatch.findMany({
      where: { programId },
      include: { cohort: { select: { id: true, name: true, code: true } }, mentee: { include: { application: true } }, provider: { include: { application: true } }, approvedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ status: "asc" }, { score: "desc" }]
    });
  }

  async findRelationships(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipRelationship.findMany({
      where: { programId },
      include: { cohort: { select: { id: true, name: true, code: true, minimumSessions: true, expectedHours: true } }, mentee: { include: { application: true } }, provider: { include: { application: true } }, match: { select: { id: true, score: true, approvedAt: true } }, goals: { orderBy: { createdAt: "desc" } }, sessions: { orderBy: { scheduledStart: "desc" } }, assignments: { include: { assignee: { include: { application: true } }, goal: true, session: true }, orderBy: { createdAt: "desc" } }, notes: { include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } }, progressUpdates: { include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async getMonitoringReport(programId: string) {
    const program = await this.findProgram(programId);
    const now = new Date();
    const inactiveBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const relationships = await this.prisma.mentorshipRelationship.findMany({
      where: { programId },
      include: {
        cohort: { select: { id: true, name: true, code: true, status: true, minimumSessions: true, expectedHours: true, programStartDate: true, programEndDate: true } },
        mentee: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
        provider: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
        goals: true,
        sessions: true,
        resourceAssignments: true,
        assignments: true,
        serviceHours: true,
        progressUpdates: { select: { createdAt: true } }
      },
      orderBy: { startDate: "desc" }
    });

    const relationshipRows = relationships.map((relationship) => {
      const completedSessions = relationship.sessions.filter((session) => session.status === MentorshipSessionStatus.COMPLETED);
      const overdueSessions = relationship.sessions.filter((session) => session.status === MentorshipSessionStatus.SCHEDULED && session.scheduledEnd < now).length;
      const verifiedMinutes = relationship.serviceHours.filter((entry) => entry.status === MentorshipServiceHourStatus.APPROVED).reduce((sum, entry) => sum + entry.minutes, 0);
      const attendance = relationship.sessions.flatMap((session) => [session.providerAttendance, session.menteeAttendance]).filter((status) => status !== MentorshipAttendanceStatus.PENDING);
      const attended = attendance.filter((status) => status === MentorshipAttendanceStatus.ATTENDED).length;
      const activeGoals = relationship.goals.filter((goal) => goal.status !== MentorshipGoalStatus.CANCELLED);
      const completedGoals = activeGoals.filter((goal) => goal.status === MentorshipGoalStatus.COMPLETED).length;
      const goalProgressPercent = activeGoals.length ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progressPercent, 0) / activeGoals.length) : 0;
      const completedResources = relationship.resourceAssignments.filter((assignment) => assignment.status === MentorshipResourceAssignmentStatus.COMPLETED).length;
      const activeAssignments = relationship.assignments.filter((assignment) => assignment.status !== MentorshipAssignmentStatus.CANCELLED);
      const completedAssignments = activeAssignments.filter((assignment) => assignment.status === MentorshipAssignmentStatus.COMPLETED).length;
      const overdueActions = activeAssignments.filter((assignment) => assignment.status !== MentorshipAssignmentStatus.COMPLETED && assignment.dueDate && assignment.dueDate < now).length;
      const activityDates = [relationship.updatedAt, ...relationship.sessions.map((session) => session.updatedAt), ...relationship.goals.map((goal) => goal.updatedAt), ...relationship.resourceAssignments.map((assignment) => assignment.updatedAt), ...relationship.assignments.map((assignment) => assignment.updatedAt), ...relationship.progressUpdates.map((update) => update.createdAt)];
      const lastActivityAt = new Date(Math.max(...activityDates.map((date) => date.getTime())));
      const targetComplete = completedSessions.length >= relationship.cohort.minimumSessions && verifiedMinutes >= relationship.cohort.expectedHours * 60;
      const inactive = ["ACTIVE", "PAUSED"].includes(relationship.status) && lastActivityAt < inactiveBefore;
      return {
        id: relationship.id,
        cohortId: relationship.cohortId,
        cohortName: relationship.cohort.name,
        status: relationship.status,
        providerRole: relationship.provider.role,
        providerName: `${relationship.provider.application.firstName} ${relationship.provider.application.lastName}`,
        providerEmail: relationship.provider.application.email,
        menteeName: `${relationship.mentee.application.firstName} ${relationship.mentee.application.lastName}`,
        menteeEmail: relationship.mentee.application.email,
        completedSessions: completedSessions.length,
        requiredSessions: relationship.cohort.minimumSessions,
        completedHours: round(verifiedMinutes / 60, 1),
        expectedHours: relationship.cohort.expectedHours,
        attendanceRate: attendance.length ? percentage(attended, attendance.length) : 0,
        completedGoals,
        totalGoals: activeGoals.length,
        goalProgressPercent,
        completedResources,
        totalResources: relationship.resourceAssignments.length,
        resourceCompletionRate: relationship.resourceAssignments.length ? percentage(completedResources, relationship.resourceAssignments.length) : 0,
        completedAssignments,
        totalAssignments: activeAssignments.length,
        overdueActions,
        overdueSessions,
        lastActivityAt: lastActivityAt.toISOString(),
        inactive,
        targetComplete
      };
    });

    const summarize = (rows: typeof relationshipRows) => {
      const rowIds = new Set(rows.map((row) => row.id));
      const sessions = relationships.filter((relationship) => rowIds.has(relationship.id)).flatMap((relationship) => relationship.sessions);
      const goals = relationships.filter((relationship) => rowIds.has(relationship.id)).flatMap((relationship) => relationship.goals).filter((goal) => goal.status !== MentorshipGoalStatus.CANCELLED);
      const attendance = sessions.flatMap((session) => [session.providerAttendance, session.menteeAttendance]).filter((status) => status !== MentorshipAttendanceStatus.PENDING);
      const attended = attendance.filter((status) => status === MentorshipAttendanceStatus.ATTENDED).length;
      return {
        relationships: rows.length,
        activeRelationships: rows.filter((row) => row.status === "ACTIVE").length,
        administrativelyCompleted: rows.filter((row) => row.status === "COMPLETED").length,
        targetComplete: rows.filter((row) => row.targetComplete).length,
        completionRate: rows.length ? percentage(rows.filter((row) => row.targetComplete).length, rows.length) : 0,
        completedSessions: sessions.filter((session) => session.status === MentorshipSessionStatus.COMPLETED).length,
        completedHours: round(rows.reduce((sum, row) => sum + row.completedHours, 0), 1),
        attendanceRate: attendance.length ? percentage(attended, attendance.length) : 0,
        goalProgressPercent: goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progressPercent, 0) / goals.length) : 0,
        completedGoals: goals.filter((goal) => goal.status === MentorshipGoalStatus.COMPLETED).length,
        totalGoals: goals.length,
        completedResources: rows.reduce((sum, row) => sum + row.completedResources, 0),
        totalResources: rows.reduce((sum, row) => sum + row.totalResources, 0),
        resourceCompletionRate: rows.reduce((sum, row) => sum + row.totalResources, 0) ? percentage(rows.reduce((sum, row) => sum + row.completedResources, 0), rows.reduce((sum, row) => sum + row.totalResources, 0)) : 0,
        completedAssignments: rows.reduce((sum, row) => sum + row.completedAssignments, 0),
        totalAssignments: rows.reduce((sum, row) => sum + row.totalAssignments, 0),
        overdueActions: rows.reduce((sum, row) => sum + row.overdueActions, 0),
        overdueSessions: rows.reduce((sum, row) => sum + row.overdueSessions, 0),
        inactiveRelationships: rows.filter((row) => row.inactive).length,
        noShows: sessions.filter((session) => session.status === MentorshipSessionStatus.NO_SHOW).length
      };
    };

    const cohorts = program.cohorts.map((cohort) => {
      const rows = relationshipRows.filter((row) => row.cohortId === cohort.id);
      return { id: cohort.id, name: cohort.name, code: cohort.code, status: cohort.status, programStartDate: cohort.programStartDate, programEndDate: cohort.programEndDate, minimumSessions: cohort.minimumSessions, expectedHours: cohort.expectedHours, ...summarize(rows) };
    });

    return { generatedAt: now.toISOString(), inactivityThresholdDays: 30, program: { id: program.id, name: program.name, code: program.code }, summary: { cohorts: cohorts.length, ...summarize(relationshipRows) }, cohorts, relationships: relationshipRows };
  }

  async findServiceHours(programId: string) {
    const program = await this.findProgram(programId);
    const entries = await this.prisma.mentorshipServiceHour.findMany({
      where: { programId },
      include: {
        cohort: { select: { id: true, name: true, code: true } },
        participant: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
        relationship: { select: { id: true } },
        session: { select: { id: true, title: true, scheduledStart: true, status: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [{ status: "asc" }, { serviceDate: "desc" }]
    });
    const participants = await this.prisma.mentorshipParticipant.findMany({
      where: { programId, role: { in: [MentorshipParticipantRole.MENTOR, MentorshipParticipantRole.TUTOR] }, status: { not: MentorshipParticipantStatus.WITHDRAWN } },
      include: {
        application: { select: { firstName: true, lastName: true, email: true } },
        cohort: { select: { id: true, name: true, code: true, expectedHours: true, stipendEnabled: true, stipendAmountCents: true, stipendPaymentModel: true, stipendRequirements: true } },
        serviceHours: { where: { status: MentorshipServiceHourStatus.APPROVED }, select: { minutes: true } },
        stipendDecision: { include: { reviewedBy: { select: { id: true, firstName: true, lastName: true } } } }
      },
      orderBy: { approvedAt: "desc" }
    });
    const eligibility = participants.map((participant) => {
      const verifiedMinutes = participant.serviceHours.reduce((sum, entry) => sum + entry.minutes, 0);
      const stipendEnabled = program.stipendsEnabled && participant.cohort.stipendEnabled;
      return {
        participantId: participant.id,
        role: participant.role,
        participant: participant.application,
        cohort: participant.cohort,
        verifiedMinutes,
        verifiedHours: round(verifiedMinutes / 60, 2),
        requiredHours: participant.cohort.expectedHours,
        hoursRequirementMet: verifiedMinutes >= participant.cohort.expectedHours * 60,
        stipendEnabled,
        requirements: Array.isArray(participant.cohort.stipendRequirements) ? participant.cohort.stipendRequirements.map(String) : [],
        decision: participant.stipendDecision
      };
    });
    return {
      summary: {
        submitted: entries.filter((entry) => entry.status === MentorshipServiceHourStatus.SUBMITTED || entry.status === MentorshipServiceHourStatus.UNDER_REVIEW).length,
        approved: entries.filter((entry) => entry.status === MentorshipServiceHourStatus.APPROVED).length,
        rejected: entries.filter((entry) => entry.status === MentorshipServiceHourStatus.REJECTED).length,
        verifiedHours: round(entries.filter((entry) => entry.status === MentorshipServiceHourStatus.APPROVED).reduce((sum, entry) => sum + entry.minutes, 0) / 60, 2),
        stipendEligible: eligibility.filter((item) => item.decision?.status === MentorshipStipendStatus.ELIGIBLE || item.decision?.status === MentorshipStipendStatus.APPROVED || item.decision?.status === MentorshipStipendStatus.PAID).length
      },
      entries,
      eligibility
    };
  }

  async createPortalServiceHour(dto: CreatePortalServiceHourDto, user: AuthenticatedUser) {
    const participant = await this.findPortalParticipant(dto.participantId, user);
    if (participant.role === MentorshipParticipantRole.MENTEE) throw new BadRequestException("Verified service hours are submitted by mentors and tutors.");
    const relationship = await this.findRelationship(participant.programId, dto.relationshipId);
    if (relationship.providerParticipantId !== participant.id) throw new BadRequestException("The selected relationship does not belong to this mentor or tutor.");
    if (dto.sessionId) {
      const session = await this.prisma.mentorshipSession.findFirst({ where: { id: dto.sessionId, relationshipId: relationship.id }, select: { id: true } });
      if (!session) throw new BadRequestException("The selected session does not belong to this relationship.");
    }
    const serviceDate = new Date(dto.serviceDate);
    if (serviceDate > new Date()) throw new BadRequestException("Service hours cannot be submitted for a future date.");
    const entry = await this.prisma.mentorshipServiceHour.create({ data: { programId: participant.programId, cohortId: participant.cohortId, participantId: participant.id, relationshipId: relationship.id, sessionId: dto.sessionId, submittedById: user.sub, serviceDate, minutes: dto.minutes, activity: dto.activity.trim(), description: dto.description?.trim(), evidenceUrl: dto.evidenceUrl?.trim() } });
    await this.audit(user, participant.program.organization.id, "mentorship.service_hours.submitted", "MentorshipServiceHour", entry.id, { minutes: entry.minutes, relationshipId: entry.relationshipId });
    return entry;
  }

  async reviewServiceHour(programId: string, entryId: string, dto: ReviewMentorshipServiceHourDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    if (!new Set<MentorshipServiceHourStatus>([MentorshipServiceHourStatus.APPROVED, MentorshipServiceHourStatus.REJECTED]).has(dto.decision)) throw new BadRequestException("A service-hour submission can only be approved or rejected.");
    const existing = await this.prisma.mentorshipServiceHour.findFirst({ where: { id: entryId, programId } });
    if (!existing) throw new NotFoundException("Service-hour submission not found.");
    const entry = await this.prisma.mentorshipServiceHour.update({ where: { id: entryId }, data: { status: dto.decision, reviewNotes: dto.reviewNotes?.trim(), reviewedById: user.sub, reviewedAt: new Date() } });
    await this.audit(user, program.organizationId, "mentorship.service_hours.reviewed", "MentorshipServiceHour", entry.id, { decision: dto.decision, minutes: entry.minutes });
    return entry;
  }

  async updateStipendDecision(programId: string, participantId: string, dto: UpdateMentorshipStipendDecisionDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const participant = await this.prisma.mentorshipParticipant.findFirst({ where: { id: participantId, programId }, include: { cohort: true, serviceHours: { where: { status: MentorshipServiceHourStatus.APPROVED }, select: { minutes: true } } } });
    if (!participant) throw new NotFoundException("Mentorship participant not found.");
    if (participant.role === MentorshipParticipantRole.MENTEE) throw new BadRequestException("Stipend service-hour decisions apply to mentors and tutors.");
    if (!program.stipendsEnabled || !participant.cohort.stipendEnabled) throw new BadRequestException("Stipend tracking is not enabled for this participant's cohort.");
    const verifiedMinutes = participant.serviceHours.reduce((sum, entry) => sum + entry.minutes, 0);
    if (new Set<MentorshipStipendStatus>([MentorshipStipendStatus.ELIGIBLE, MentorshipStipendStatus.APPROVED, MentorshipStipendStatus.PAID]).has(dto.status) && verifiedMinutes < participant.cohort.expectedHours * 60) throw new BadRequestException("The participant does not yet have enough approved service hours for this stipend decision.");
    const decision = await this.prisma.mentorshipStipendDecision.upsert({
      where: { participantId },
      create: { programId, cohortId: participant.cohortId, participantId, reviewedById: user.sub, status: dto.status, verifiedMinutesAtDecision: verifiedMinutes, notes: dto.notes?.trim(), paidAt: dto.status === MentorshipStipendStatus.PAID ? new Date() : undefined },
      update: { reviewedById: user.sub, status: dto.status, verifiedMinutesAtDecision: verifiedMinutes, notes: dto.notes?.trim(), decidedAt: new Date(), paidAt: dto.status === MentorshipStipendStatus.PAID ? new Date() : null }
    });
    await this.audit(user, program.organizationId, "mentorship.stipend.decision_updated", "MentorshipStipendDecision", decision.id, { participantId, status: dto.status, verifiedMinutes });
    return decision;
  }

  async findResources(programId: string) {
    await this.findProgram(programId);
    return this.prisma.mentorshipResource.findMany({
      where: { programId, archivedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignments: {
          include: {
            assignee: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
            relationship: { include: { cohort: { select: { id: true, name: true, code: true } } } },
            goal: { select: { id: true, title: true } },
            session: { select: { id: true, title: true, scheduledStart: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createResource(programId: string, dto: CreateMentorshipResourceDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const resource = await this.prisma.mentorshipResource.create({ data: { programId, createdById: user.sub, title: dto.title.trim(), description: dto.description?.trim(), type: dto.type, url: dto.url.trim(), tags: this.cleanTags(dto.tags) } });
    await this.audit(user, program.organizationId, "mentorship.resource.created", "MentorshipResource", resource.id, { type: resource.type });
    return resource;
  }

  async updateResource(programId: string, resourceId: string, dto: UpdateMentorshipResourceDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.prisma.mentorshipResource.findFirst({ where: { id: resourceId, programId, archivedAt: null } });
    if (!existing) throw new NotFoundException("Mentorship resource not found.");
    const resource = await this.prisma.mentorshipResource.update({ where: { id: resourceId }, data: { title: dto.title?.trim(), description: dto.description?.trim(), type: dto.type, url: dto.url?.trim(), tags: dto.tags ? this.cleanTags(dto.tags) : undefined } });
    await this.audit(user, program.organizationId, "mentorship.resource.updated", "MentorshipResource", resource.id, { type: resource.type });
    return resource;
  }

  async archiveResource(programId: string, resourceId: string, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const existing = await this.prisma.mentorshipResource.findFirst({ where: { id: resourceId, programId, archivedAt: null } });
    if (!existing) throw new NotFoundException("Mentorship resource not found.");
    const resource = await this.prisma.mentorshipResource.update({ where: { id: resourceId }, data: { archivedAt: new Date() } });
    await this.audit(user, program.organizationId, "mentorship.resource.archived", "MentorshipResource", resource.id, {});
    return resource;
  }

  async assignResource(programId: string, resourceId: string, dto: AssignMentorshipResourceDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const resource = await this.prisma.mentorshipResource.findFirst({ where: { id: resourceId, programId, archivedAt: null } });
    if (!resource) throw new NotFoundException("Mentorship resource not found.");
    const relationship = await this.findRelationship(programId, dto.relationshipId);
    const assigneeIds = [...new Set(dto.assigneeParticipantIds)];
    const relationshipParticipantIds = new Set([relationship.menteeParticipantId, relationship.providerParticipantId]);
    if (assigneeIds.some((id) => !relationshipParticipantIds.has(id))) throw new BadRequestException("Resources can be assigned only to participants in this relationship.");
    if (dto.goalId && !(await this.prisma.mentorshipGoal.findFirst({ where: { id: dto.goalId, relationshipId: relationship.id }, select: { id: true } }))) throw new BadRequestException("The selected goal does not belong to this relationship.");
    if (dto.sessionId && !(await this.prisma.mentorshipSession.findFirst({ where: { id: dto.sessionId, relationshipId: relationship.id }, select: { id: true } }))) throw new BadRequestException("The selected session does not belong to this relationship.");
    const existing = await this.prisma.mentorshipResourceAssignment.findMany({ where: { resourceId, relationshipId: relationship.id, assigneeParticipantId: { in: assigneeIds }, goalId: dto.goalId ?? null, sessionId: dto.sessionId ?? null }, select: { assigneeParticipantId: true } });
    const existingIds = new Set(existing.map((assignment) => assignment.assigneeParticipantId));
    const newAssigneeIds = assigneeIds.filter((id) => !existingIds.has(id));
    if (!newAssigneeIds.length) throw new BadRequestException("This resource is already assigned to the selected participant or participants.");
    const assignments = await this.prisma.$transaction(newAssigneeIds.map((assigneeParticipantId) => this.prisma.mentorshipResourceAssignment.create({ data: { resourceId, relationshipId: relationship.id, goalId: dto.goalId, sessionId: dto.sessionId, assigneeParticipantId, assignedById: user.sub, dueDate: this.toDate(dto.dueDate), notes: dto.notes?.trim() } })));
    await this.audit(user, program.organizationId, "mentorship.resource.assigned", "MentorshipResource", resourceId, { relationshipId: relationship.id, assignmentIds: assignments.map((assignment) => assignment.id) });
    return assignments;
  }

  async updatePortalResourceAssignment(assignmentId: string, dto: UpdatePortalResourceAssignmentDto, user: AuthenticatedUser) {
    const assignment = await this.prisma.mentorshipResourceAssignment.findFirst({
      where: { id: assignmentId, assignee: this.portalParticipantWhere(user), resource: { archivedAt: null, program: { organization: { enabledAddOns: { has: "MENTORSHIP" } } } } },
      include: { resource: { include: { program: { select: { organizationId: true } } } } }
    });
    if (!assignment) throw new NotFoundException("Resource assignment not found.");
    const updated = await this.prisma.mentorshipResourceAssignment.update({ where: { id: assignmentId }, data: { status: dto.status, completionNotes: dto.completionNotes?.trim(), completedAt: dto.status === MentorshipResourceAssignmentStatus.COMPLETED ? new Date() : null } });
    await this.audit(user, assignment.resource.program.organizationId, "mentorship.resource.assignment_updated", "MentorshipResourceAssignment", assignment.id, { status: dto.status });
    return updated;
  }

  async findParticipantPortal(user: AuthenticatedUser) {
    const relationships = {
      include: {
        cohort: { select: { id: true, name: true, code: true, minimumSessions: true, expectedHours: true, programStartDate: true, programEndDate: true } },
        goals: { orderBy: { createdAt: "desc" as const } },
        sessions: { orderBy: { scheduledStart: "desc" as const } },
        resourceAssignments: {
          where: { resource: { archivedAt: null } },
          include: {
            resource: { select: { id: true, title: true, description: true, type: true, url: true, tags: true } },
            assignee: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
            goal: { select: { id: true, title: true } },
            session: { select: { id: true, title: true, scheduledStart: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: "desc" as const }
        },
        assignments: { include: { assignee: { select: { id: true, role: true } }, goal: { select: { id: true, title: true } }, session: { select: { id: true, title: true, scheduledStart: true } } }, orderBy: { createdAt: "desc" as const } },
        notes: { where: { visibility: MentorshipNoteVisibility.SHARED }, include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" as const } },
        progressUpdates: { include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" as const } },
        mentee: { include: { application: { select: { firstName: true, lastName: true, email: true } } } },
        provider: { include: { application: { select: { firstName: true, lastName: true, email: true } } } }
      },
      orderBy: { startDate: "desc" as const }
    };
    const participants = await this.prisma.mentorshipParticipant.findMany({
      where: { ...this.portalParticipantWhere(user), status: { not: MentorshipParticipantStatus.WITHDRAWN }, program: { organization: { enabledAddOns: { has: "MENTORSHIP" } } } },
      include: {
        application: { select: { firstName: true, lastName: true, email: true, timeZone: true, availability: true, meetingMode: true, hoursPerWeek: true } },
        program: { select: { id: true, name: true, code: true, description: true, timeZone: true } },
        cohort: { select: { id: true, name: true, code: true, status: true, minimumSessions: true, expectedHours: true, programStartDate: true, programEndDate: true } },
        resourceAssignments: {
          where: { resource: { archivedAt: null } },
          include: {
            resource: { select: { id: true, title: true, description: true, type: true, url: true, tags: true } },
            relationship: { select: { id: true } },
            goal: { select: { id: true, title: true } },
            session: { select: { id: true, title: true, scheduledStart: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        serviceHours: { include: { session: { select: { id: true, title: true, scheduledStart: true } }, reviewedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { serviceDate: "desc" } },
        stipendDecision: { include: { reviewedBy: { select: { id: true, firstName: true, lastName: true } } } },
        relationshipsAsMentee: relationships,
        relationshipsAsProvider: relationships
      },
      orderBy: { approvedAt: "desc" }
    });

    return {
      notifications: await this.prisma.mentorshipNotification.findMany({ where: { recipientUserId: user.sub }, orderBy: { createdAt: "desc" }, take: 50 }),
      participants: participants.map((participant) => ({
        id: participant.id,
        role: participant.role,
        status: participant.status,
        availableForMatch: participant.availableForMatch,
        application: participant.application,
        program: participant.program,
        cohort: participant.cohort,
        resources: participant.resourceAssignments,
        serviceHours: participant.serviceHours,
        stipendDecision: participant.stipendDecision,
        relationships: [
          ...participant.relationshipsAsMentee.map((relationship) => ({ ...relationship, counterpart: { role: relationship.provider.role, name: `${relationship.provider.application.firstName} ${relationship.provider.application.lastName}`, email: relationship.provider.application.email } })),
          ...participant.relationshipsAsProvider.map((relationship) => ({ ...relationship, counterpart: { role: relationship.mentee.role, name: `${relationship.mentee.application.firstName} ${relationship.mentee.application.lastName}`, email: relationship.mentee.application.email } }))
        ]
      }))
    };
  }

  async updatePortalAvailability(dto: UpdatePortalAvailabilityDto, user: AuthenticatedUser) {
    const participant = await this.findPortalParticipant(dto.participantId, user);
    const result = await this.prisma.$transaction(async (transaction) => {
      const application = await transaction.mentorshipApplication.update({ where: { id: participant.applicationId }, data: { availability: dto.availability as Prisma.InputJsonValue, meetingMode: dto.meetingMode, hoursPerWeek: dto.hoursPerWeek } });
      const updatedParticipant = dto.availableForMatch === undefined ? participant : await transaction.mentorshipParticipant.update({ where: { id: participant.id }, data: { availableForMatch: dto.availableForMatch } });
      return { application, participant: updatedParticipant };
    });
    await this.audit(user, participant.program.organization.id, "mentorship.portal.availability_updated", "MentorshipParticipant", participant.id, { availableForMatch: result.participant.availableForMatch });
    return result;
  }

  async reschedulePortalSession(sessionId: string, dto: ReschedulePortalSessionDto, user: AuthenticatedUser) {
    const session = await this.findPortalSession(sessionId, user);
    if (session.status !== MentorshipSessionStatus.SCHEDULED) throw new BadRequestException("Only scheduled sessions can be rescheduled.");
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (start <= new Date()) throw new BadRequestException("The rescheduled session must be in the future.");
    if (start >= end) throw new BadRequestException("Session end time must be after its start time.");
    const notes = dto.reason?.trim() ? [session.notes, `Participant reschedule note: ${dto.reason.trim()}`].filter(Boolean).join("\n\n") : session.notes;
    const updated = await this.prisma.mentorshipSession.update({ where: { id: sessionId }, data: { scheduledStart: start, scheduledEnd: end, notes } });
    await this.audit(user, session.relationship.program.organizationId, "mentorship.portal.session_rescheduled", "MentorshipSession", sessionId, { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() });
    await this.queueRelationshipNotice(session.relationshipId, MentorshipNotificationType.SESSION_RESCHEDULED, `Session rescheduled — ${session.title}`, `Your classroom session was rescheduled to ${start.toLocaleString("en-US")}.`, `session-rescheduled:${session.id}:${start.toISOString()}`);
    return updated;
  }

  async cancelPortalSession(sessionId: string, dto: CancelPortalSessionDto, user: AuthenticatedUser) {
    const session = await this.findPortalSession(sessionId, user);
    if (session.status !== MentorshipSessionStatus.SCHEDULED) throw new BadRequestException("Only scheduled sessions can be cancelled.");
    const notes = dto.reason?.trim() ? [session.notes, `Participant cancellation note: ${dto.reason.trim()}`].filter(Boolean).join("\n\n") : session.notes;
    const updated = await this.prisma.mentorshipSession.update({ where: { id: sessionId }, data: { status: MentorshipSessionStatus.CANCELLED, notes } });
    await this.audit(user, session.relationship.program.organizationId, "mentorship.portal.session_cancelled", "MentorshipSession", sessionId, { reasonProvided: Boolean(dto.reason?.trim()) });
    await this.queueRelationshipNotice(session.relationshipId, MentorshipNotificationType.SESSION_CANCELLED, `Session cancelled — ${session.title}`, `The classroom session scheduled for ${session.scheduledStart.toLocaleString("en-US")} was cancelled.${dto.reason?.trim() ? ` Reason: ${dto.reason.trim()}` : ""}`, `session-cancelled:${session.id}`);
    return updated;
  }

  async createPortalFeedback(sessionId: string, dto: CreatePortalFeedbackDto, user: AuthenticatedUser) {
    const session = await this.findPortalSession(sessionId, user);
    if (session.status !== MentorshipSessionStatus.COMPLETED) throw new BadRequestException("Feedback can be submitted after a completed session.");
    const update = await this.prisma.mentorshipProgressUpdate.create({ data: { relationshipId: session.relationshipId, authorId: user.sub, summary: `Session feedback — ${session.title}`, challenges: dto.comments?.trim(), nextSteps: dto.nextSteps?.trim(), progressRating: dto.rating }, include: { author: { select: { id: true, firstName: true, lastName: true } } } });
    await this.audit(user, session.relationship.program.organizationId, "mentorship.portal.feedback_created", "MentorshipSession", sessionId, { progressUpdateId: update.id, rating: dto.rating });
    return update;
  }

  async updatePortalAssignment(assignmentId: string, dto: UpdatePortalAssignmentDto, user: AuthenticatedUser) {
    const assignment = await this.prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, assignee: this.portalParticipantWhere(user), relationship: { program: { organization: { enabledAddOns: { has: "MENTORSHIP" } } } } },
      include: { relationship: { include: { program: { select: { organizationId: true } } } } }
    });
    if (!assignment) throw new NotFoundException("Classroom assignment not found.");
    if (assignment.status === MentorshipAssignmentStatus.CANCELLED) throw new BadRequestException("A cancelled assignment cannot be changed.");
    const updated = await this.prisma.mentorshipAssignment.update({ where: { id: assignmentId }, data: { status: dto.status, completedAt: dto.status === MentorshipAssignmentStatus.COMPLETED ? new Date() : null } });
    await this.audit(user, assignment.relationship.program.organizationId, "mentorship.portal.assignment_updated", "MentorshipAssignment", assignment.id, { status: dto.status });
    return updated;
  }

  async createPortalNote(relationshipId: string, dto: CreatePortalNoteDto, user: AuthenticatedUser) {
    const participantIds = (await this.prisma.mentorshipParticipant.findMany({ where: this.portalParticipantWhere(user), select: { id: true } })).map((participant) => participant.id);
    const relationship = participantIds.length ? await this.prisma.mentorshipRelationship.findFirst({ where: { id: relationshipId, OR: [{ menteeParticipantId: { in: participantIds } }, { providerParticipantId: { in: participantIds } }], program: { organization: { enabledAddOns: { has: "MENTORSHIP" } } } }, include: { program: { select: { organizationId: true } } } }) : null;
    if (!relationship) throw new NotFoundException("Classroom not found.");
    const note = await this.prisma.mentorshipNote.create({ data: { relationshipId, authorId: user.sub, body: dto.body.trim(), visibility: MentorshipNoteVisibility.SHARED }, include: { author: { select: { id: true, firstName: true, lastName: true } } } });
    await this.audit(user, relationship.program.organizationId, "mentorship.portal.note_created", "MentorshipNote", note.id, { relationshipId, visibility: MentorshipNoteVisibility.SHARED });
    return note;
  }

  async createGoal(programId: string, relationshipId: string, dto: CreateMentorshipGoalDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const goal = await this.prisma.mentorshipGoal.create({ data: { relationshipId, title: dto.title.trim(), description: dto.description?.trim(), targetDate: this.toDate(dto.targetDate) } });
    await this.audit(user, program.organizationId, "mentorship.goal.created", "MentorshipGoal", goal.id, { relationshipId });
    return goal;
  }

  async updateGoal(programId: string, relationshipId: string, goalId: string, dto: UpdateMentorshipGoalDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const existing = await this.prisma.mentorshipGoal.findFirst({ where: { id: goalId, relationshipId } });
    if (!existing) throw new NotFoundException("Mentorship goal not found.");
    const progressPercent = dto.status === MentorshipGoalStatus.COMPLETED ? 100 : dto.progressPercent;
    const status = dto.status ?? (progressPercent !== undefined && progressPercent > 0 ? MentorshipGoalStatus.IN_PROGRESS : undefined);
    const goal = await this.prisma.mentorshipGoal.update({ where: { id: goalId }, data: { title: dto.title?.trim(), description: dto.description?.trim(), targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined, status, progressPercent, completedAt: status === MentorshipGoalStatus.COMPLETED ? new Date() : status ? null : undefined } });
    await this.audit(user, program.organizationId, "mentorship.goal.updated", "MentorshipGoal", goal.id, { relationshipId, status: goal.status, progressPercent: goal.progressPercent });
    return goal;
  }

  async createSession(programId: string, relationshipId: string, dto: CreateMentorshipSessionDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const relationship = await this.findRelationship(programId, relationshipId);
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (start >= end) throw new BadRequestException("Session end time must be after its start time.");
    const result = await this.prisma.$transaction(async (transaction) => {
      const session = await transaction.mentorshipSession.create({ data: { relationshipId, title: dto.title.trim(), scheduledStart: start, scheduledEnd: end, meetingMode: dto.meetingMode, location: dto.location?.trim(), videoUrl: dto.videoUrl?.trim(), agenda: dto.agenda?.trim(), createdById: user.sub } });
      const subject = `Mentorship session scheduled — ${dto.title.trim()}`;
      const details = `${start.toLocaleString("en-US", { timeZone: program.timeZone })} (${program.timeZone})${dto.videoUrl ? `\n${dto.videoUrl}` : dto.location ? `\n${dto.location}` : ""}`;
      const menteeEmail = await transaction.mentorshipEmailOutbox.create({ data: { organizationId: program.organizationId, programId, applicationId: relationship.mentee.applicationId, recipient: relationship.mentee.application.email, subject, body: `A mentorship session has been scheduled for ${relationship.cohort.name}.\n\n${details}\n\n${dto.agenda ?? ""}`.trim() } });
      const providerEmail = await transaction.mentorshipEmailOutbox.create({ data: { organizationId: program.organizationId, programId, applicationId: relationship.provider.applicationId, recipient: relationship.provider.application.email, subject, body: `A mentorship session has been scheduled for ${relationship.cohort.name}.\n\n${details}\n\n${dto.agenda ?? ""}`.trim() } });
      return { session, emailOutboxIds: [menteeEmail.id, providerEmail.id], subject, details };
    });
    await this.audit(user, program.organizationId, "mentorship.session.created", "MentorshipSession", result.session.id, { relationshipId, scheduledStart: start.toISOString() });
    await Promise.all(result.emailOutboxIds.map((id) => this.dispatchEmailOutbox(id)));
    await this.queueRelationshipNotice(relationshipId, MentorshipNotificationType.SESSION_SCHEDULED, result.subject, result.details, `session-scheduled:${result.session.id}`, undefined, false);
    return result.session;
  }

  async updateSession(programId: string, relationshipId: string, sessionId: string, dto: UpdateMentorshipSessionDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const existing = await this.prisma.mentorshipSession.findFirst({ where: { id: sessionId, relationshipId } });
    if (!existing) throw new NotFoundException("Mentorship session not found.");
    const providerAttendance = dto.providerAttendance ?? existing.providerAttendance;
    const menteeAttendance = dto.menteeAttendance ?? existing.menteeAttendance;
    if (dto.status === MentorshipSessionStatus.COMPLETED && (providerAttendance === MentorshipAttendanceStatus.PENDING || menteeAttendance === MentorshipAttendanceStatus.PENDING)) throw new BadRequestException("Record attendance for both participants before completing the session.");
    const scheduledMinutes = Math.max(1, Math.round((existing.scheduledEnd.getTime() - existing.scheduledStart.getTime()) / 60000));
    const completedMinutes = dto.status === MentorshipSessionStatus.COMPLETED ? dto.completedMinutes ?? scheduledMinutes : dto.completedMinutes;
    if (dto.status === MentorshipSessionStatus.COMPLETED && (!completedMinutes || completedMinutes < 1)) throw new BadRequestException("Completed sessions must record at least one minute.");
    const session = await this.prisma.mentorshipSession.update({ where: { id: sessionId }, data: { status: dto.status, providerAttendance: dto.providerAttendance, menteeAttendance: dto.menteeAttendance, completedMinutes, notes: dto.notes?.trim() } });
    await this.audit(user, program.organizationId, "mentorship.session.updated", "MentorshipSession", session.id, { relationshipId, status: session.status, completedMinutes: session.completedMinutes });
    if (dto.status === MentorshipSessionStatus.CANCELLED) await this.queueRelationshipNotice(relationshipId, MentorshipNotificationType.SESSION_CANCELLED, `Session cancelled — ${existing.title}`, `The classroom session scheduled for ${existing.scheduledStart.toLocaleString("en-US", { timeZone: program.timeZone })} (${program.timeZone}) was cancelled.`, `session-cancelled:${session.id}`);
    return session;
  }

  async createProgressUpdate(programId: string, relationshipId: string, dto: CreateMentorshipProgressUpdateDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const update = await this.prisma.mentorshipProgressUpdate.create({ data: { relationshipId, authorId: user.sub, summary: dto.summary.trim(), challenges: dto.challenges?.trim(), nextSteps: dto.nextSteps?.trim(), progressRating: dto.progressRating }, include: { author: { select: { id: true, firstName: true, lastName: true } } } });
    await this.audit(user, program.organizationId, "mentorship.progress.created", "MentorshipProgressUpdate", update.id, { relationshipId, progressRating: update.progressRating });
    return update;
  }

  async createAssignment(programId: string, relationshipId: string, dto: CreateMentorshipAssignmentDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const relationship = await this.findRelationship(programId, relationshipId);
    if (![relationship.menteeParticipantId, relationship.providerParticipantId].includes(dto.assigneeParticipantId)) throw new BadRequestException("The assignee must belong to this classroom.");
    if (dto.goalId && !(await this.prisma.mentorshipGoal.findFirst({ where: { id: dto.goalId, relationshipId } }))) throw new BadRequestException("The selected goal does not belong to this classroom.");
    if (dto.sessionId && !(await this.prisma.mentorshipSession.findFirst({ where: { id: dto.sessionId, relationshipId } }))) throw new BadRequestException("The selected session does not belong to this classroom.");
    const assignment = await this.prisma.mentorshipAssignment.create({ data: { relationshipId, assigneeParticipantId: dto.assigneeParticipantId, goalId: dto.goalId, sessionId: dto.sessionId, title: dto.title.trim(), description: dto.description?.trim(), dueDate: this.toDate(dto.dueDate), createdById: user.sub }, include: { assignee: { include: { application: true } }, goal: true, session: true } });
    await this.audit(user, program.organizationId, "mentorship.assignment.created", "MentorshipAssignment", assignment.id, { relationshipId, assigneeParticipantId: dto.assigneeParticipantId, dueDate: assignment.dueDate?.toISOString() });
    return assignment;
  }

  async updateAssignment(programId: string, relationshipId: string, assignmentId: string, dto: UpdateMentorshipAssignmentDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const existing = await this.prisma.mentorshipAssignment.findFirst({ where: { id: assignmentId, relationshipId } });
    if (!existing) throw new NotFoundException("Classroom assignment not found.");
    const assignment = await this.prisma.mentorshipAssignment.update({ where: { id: assignmentId }, data: { title: dto.title?.trim(), description: dto.description?.trim(), dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, status: dto.status, completedAt: dto.status === MentorshipAssignmentStatus.COMPLETED ? new Date() : dto.status ? null : undefined } });
    await this.audit(user, program.organizationId, "mentorship.assignment.updated", "MentorshipAssignment", assignment.id, { relationshipId, status: assignment.status });
    return assignment;
  }

  async createNote(programId: string, relationshipId: string, dto: CreateMentorshipNoteDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    await this.findRelationship(programId, relationshipId);
    const note = await this.prisma.mentorshipNote.create({ data: { relationshipId, authorId: user.sub, body: dto.body.trim(), visibility: dto.visibility ?? MentorshipNoteVisibility.SHARED }, include: { author: { select: { id: true, firstName: true, lastName: true } } } });
    await this.audit(user, program.organizationId, "mentorship.note.created", "MentorshipNote", note.id, { relationshipId, visibility: note.visibility });
    return note;
  }

  async processNotifications(programId: string, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const now = new Date();
    const reminderCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.mentorshipSession.findMany({ where: { relationship: { programId }, status: MentorshipSessionStatus.SCHEDULED, scheduledStart: { gt: now, lte: reminderCutoff } }, select: { id: true, relationshipId: true, title: true, scheduledStart: true } });
    const overdue = await this.prisma.mentorshipAssignment.findMany({ where: { relationship: { programId }, status: { in: [MentorshipAssignmentStatus.TODO, MentorshipAssignmentStatus.IN_PROGRESS] }, dueDate: { lt: now } }, select: { id: true, relationshipId: true, assigneeParticipantId: true, title: true, dueDate: true } });
    let delivered = 0;
    for (const session of sessions) delivered += await this.queueRelationshipNotice(session.relationshipId, MentorshipNotificationType.SESSION_REMINDER, `Session reminder — ${session.title}`, `Your classroom session starts ${session.scheduledStart.toLocaleString("en-US", { timeZone: program.timeZone })} (${program.timeZone}).`, `session-reminder:${session.id}:${session.scheduledStart.toISOString()}`);
    for (const assignment of overdue) delivered += await this.queueRelationshipNotice(assignment.relationshipId, MentorshipNotificationType.ACTION_OVERDUE, `Overdue classroom action — ${assignment.title}`, `This classroom action was due ${assignment.dueDate?.toLocaleDateString("en-US", { timeZone: program.timeZone })}.`, `assignment-overdue:${assignment.id}`, assignment.assigneeParticipantId);
    await this.audit(user, program.organizationId, "mentorship.notifications.processed", "MentorshipProgram", programId, { sessions: sessions.length, overdueActions: overdue.length, delivered });
    return { sessions: sessions.length, overdueActions: overdue.length, delivered };
  }

  async retryPendingEmails(programId: string, recipients: string[], user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const normalizedRecipients = [...new Set(recipients.map((recipient) => recipient.trim().toLowerCase()))];
    if (!normalizedRecipients.length) throw new BadRequestException("At least one email recipient is required.");
    const pending = await this.prisma.mentorshipEmailOutbox.findMany({
      where: { programId, sentAt: null, recipient: { in: normalizedRecipients } },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true }
    });
    let sent = 0;
    let failed = 0;
    for (const email of pending) {
      const result = await this.dispatchEmailOutbox(email.id);
      if (result === "sent") sent += 1;
      if (result === "failed") failed += 1;
    }
    await this.audit(user, program.organizationId, "mentorship.email_outbox.retried", "MentorshipProgram", programId, { attempted: pending.length, sent, failed, recipients: normalizedRecipients.length });
    return { attempted: pending.length, sent, failed };
  }

  async generateMatches(programId: string, cohortId: string, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    const cohort = await this.findCohort(programId, cohortId);
    if (!cohort.matchingEnabled) throw new BadRequestException("Matching is disabled for this cohort.");
    const participants = await this.prisma.mentorshipParticipant.findMany({ where: { cohortId, status: { in: [MentorshipParticipantStatus.MATCHING_POOL, MentorshipParticipantStatus.ACTIVE] }, availableForMatch: true }, include: { application: true } });
    const mentees = participants.filter((item) => item.role === MentorshipParticipantRole.MENTEE);
    const providers = participants.filter((item) => item.role === MentorshipParticipantRole.MENTOR || item.role === MentorshipParticipantRole.TUTOR);
    if (!mentees.length || !providers.length) throw new BadRequestException("Matching requires at least one eligible mentee and one approved mentor or tutor.");
    for (const mentee of mentees) {
      const ranked = providers.map((provider) => ({ provider, ...this.matchScore(mentee.application, provider.application) })).sort((a, b) => b.score - a.score).slice(0, cohort.recommendationCount);
      for (const recommendation of ranked) await this.prisma.mentorshipMatch.upsert({ where: { cohortId_menteeParticipantId_providerParticipantId: { cohortId, menteeParticipantId: mentee.id, providerParticipantId: recommendation.provider.id } }, create: { programId, cohortId, menteeParticipantId: mentee.id, providerParticipantId: recommendation.provider.id, score: recommendation.score, scoreBreakdown: recommendation.breakdown }, update: { score: recommendation.score, scoreBreakdown: recommendation.breakdown } });
    }
    await this.audit(user, program.organizationId, "mentorship.matches.generated", "MentorshipCohort", cohortId, { mentees: mentees.length, providers: providers.length });
    return this.findMatches(programId);
  }

  async decideMatch(programId: string, matchId: string, dto: DecideMentorshipMatchDto, user: AuthenticatedUser) {
    const program = await this.findProgram(programId);
    if (dto.decision !== MentorshipMatchStatus.APPROVED && dto.decision !== MentorshipMatchStatus.REJECTED) throw new BadRequestException("A proposed match can only be approved or rejected.");
    const existing = await this.prisma.mentorshipMatch.findFirst({ where: { id: matchId, programId }, include: { mentee: { include: { application: true } }, provider: { include: { application: true } }, relationship: true } });
    if (!existing) throw new NotFoundException("Mentorship match not found.");
    const cohort = await this.findCohort(programId, existing.cohortId);
    if (dto.decision === MentorshipMatchStatus.APPROVED) {
      const active = await this.prisma.mentorshipRelationship.findFirst({
        where: {
          cohortId: existing.cohortId,
          menteeParticipantId: existing.menteeParticipantId,
          status: { in: ["ACTIVE", "PAUSED"] },
          matchId: { not: matchId },
          provider: { role: existing.provider.role }
        }
      });
      if (active) throw new BadRequestException(`This mentee already has an active ${this.roleLabel(existing.provider.role)} relationship in the cohort.`);
    }
    const result = await this.prisma.$transaction(async (transaction) => {
      const decided = await transaction.mentorshipMatch.update({ where: { id: matchId }, data: { status: dto.decision, notes: dto.notes?.trim(), approvedById: dto.decision === MentorshipMatchStatus.APPROVED ? user.sub : null, approvedAt: dto.decision === MentorshipMatchStatus.APPROVED ? new Date() : null } });
      const emailOutboxIds: string[] = [];
      const newlyApproved = dto.decision === MentorshipMatchStatus.APPROVED && existing.status !== MentorshipMatchStatus.APPROVED && existing.status !== MentorshipMatchStatus.ACTIVE;
      if (newlyApproved) {
        await transaction.mentorshipRelationship.upsert({
          where: { matchId },
          create: { matchId, programId, cohortId: existing.cohortId, menteeParticipantId: existing.menteeParticipantId, providerParticipantId: existing.providerParticipantId, status: "ACTIVE", startDate: cohort.programStartDate, endDate: cohort.programEndDate },
          update: { status: "ACTIVE", startDate: cohort.programStartDate, endDate: cohort.programEndDate }
        });
        await transaction.mentorshipParticipant.updateMany({ where: { id: { in: [existing.menteeParticipantId, existing.providerParticipantId] } }, data: { status: MentorshipParticipantStatus.ACTIVE } });
        const providerName = `${existing.provider.application.firstName} ${existing.provider.application.lastName}`;
        const menteeName = `${existing.mentee.application.firstName} ${existing.mentee.application.lastName}`;
        const subject = `Mentorship match confirmed — ${cohort.name}`;
        const menteeEmail = await transaction.mentorshipEmailOutbox.create({ data: { organizationId: program.organizationId, programId, applicationId: existing.mentee.applicationId, recipient: existing.mentee.application.email, subject, body: `Your ${this.roleLabel(existing.provider.role)} match for ${cohort.name} has been confirmed.\n\n${providerName}\n${existing.provider.application.email}\n\nThe program team will provide any additional onboarding instructions.` } });
        const providerEmail = await transaction.mentorshipEmailOutbox.create({ data: { organizationId: program.organizationId, programId, applicationId: existing.provider.applicationId, recipient: existing.provider.application.email, subject, body: `Your mentee match for ${cohort.name} has been confirmed.\n\n${menteeName}\n${existing.mentee.application.email}\n\nThe program team will provide any additional onboarding instructions.` } });
        emailOutboxIds.push(menteeEmail.id, providerEmail.id);
      } else if (dto.decision === MentorshipMatchStatus.REJECTED && existing.relationship && (existing.relationship.status === "ACTIVE" || existing.relationship.status === "PAUSED")) {
        await transaction.mentorshipRelationship.update({ where: { id: existing.relationship.id }, data: { status: "ENDED", endDate: new Date() } });
        for (const participantId of [existing.menteeParticipantId, existing.providerParticipantId]) {
          const remainingRelationships = await transaction.mentorshipRelationship.count({
            where: {
              status: { in: ["ACTIVE", "PAUSED"] },
              matchId: { not: matchId },
              OR: [{ menteeParticipantId: participantId }, { providerParticipantId: participantId }]
            }
          });
          await transaction.mentorshipParticipant.update({ where: { id: participantId }, data: { status: remainingRelationships ? MentorshipParticipantStatus.ACTIVE : MentorshipParticipantStatus.MATCHING_POOL } });
        }
      }
      return { decided, emailOutboxIds };
    });
    await this.audit(user, program.organizationId, "mentorship.match.decided", "MentorshipMatch", matchId, { previousDecision: existing.status, decision: dto.decision, notesUpdated: dto.notes !== undefined });
    await Promise.all(result.emailOutboxIds.map((id) => this.dispatchEmailOutbox(id)));
    if (dto.decision === MentorshipMatchStatus.APPROVED && result.emailOutboxIds.length) {
      const relationship = await this.prisma.mentorshipRelationship.findFirst({ where: { matchId }, select: { id: true } });
      if (relationship) await this.queueRelationshipNotice(relationship.id, MentorshipNotificationType.MATCH_CONFIRMED, `Mentorship match confirmed — ${cohort.name}`, `Your ${this.roleLabel(existing.provider.role)} classroom is now active.`, `match-confirmed:${matchId}`, undefined, false);
    }
    return result.decided;
  }

  private matchScore(mentee: { languages: unknown; meetingMode: unknown; careerInterests: unknown; supportNeeds: unknown }, provider: { languages: unknown; meetingMode: unknown; expertise: unknown; mentoringCapabilities: unknown }) {
    const list = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.toLowerCase()) : [];
    const overlap = (left: string[], right: string[]) => left.some((item) => right.includes(item));
    const language = overlap(list(mentee.languages), list(provider.languages)) ? 25 : 0;
    const meetingMode = mentee.meetingMode && mentee.meetingMode === provider.meetingMode ? 20 : 0;
    const needs = [...list(mentee.careerInterests), ...list(mentee.supportNeeds)];
    const capabilities = [...list(provider.mentoringCapabilities), ...Object.keys((provider.expertise ?? {}) as object).map((item) => item.toLowerCase())];
    const alignment = overlap(needs, capabilities) ? 35 : 15;
    const breakdown = { base: 20, language, meetingMode, alignment };
    return { score: Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)), breakdown };
  }

  private async findCohort(programId: string, id: string) {
    const cohort = await this.prisma.mentorshipCohort.findFirst({ where: { id, programId, status: { not: MentorshipCohortStatus.ARCHIVED } } });
    if (!cohort) throw new NotFoundException("Mentorship cohort not found.");
    return cohort;
  }

  private async findRelationship(programId: string, id: string) {
    const relationship = await this.prisma.mentorshipRelationship.findFirst({ where: { id, programId }, include: { cohort: true, mentee: { include: { application: true } }, provider: { include: { application: true } } } });
    if (!relationship) throw new NotFoundException("Mentorship relationship not found.");
    return relationship;
  }

  private async findApplication(programId: string, id: string) {
    const application = await this.prisma.mentorshipApplication.findFirst({ where: { id, programId }, include: applicationInclude });
    if (!application) throw new NotFoundException("Mentorship application not found.");
    return application;
  }

  private applicationData(programId: string, dto: CreateMentorshipApplicationDto, status: MentorshipApplicationStatus): Prisma.MentorshipApplicationUncheckedCreateInput {
    return {
      ...this.applicationFields(dto), programId, cohortId: dto.cohortId, applicantUserId: dto.applicantUserId, role: dto.role, source: dto.source,
      firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email: dto.email.trim().toLowerCase(), timeZone: dto.timeZone, languages: dto.languages as Prisma.InputJsonValue,
      disciplines: (dto.disciplines ?? []) as Prisma.InputJsonValue, expertise: (dto.expertise ?? {}) as Prisma.InputJsonValue, mentoringCapabilities: (dto.mentoringCapabilities ?? []) as Prisma.InputJsonValue,
      supportNeeds: (dto.supportNeeds ?? []) as Prisma.InputJsonValue, careerInterests: (dto.careerInterests ?? []) as Prisma.InputJsonValue, availability: (dto.availability ?? {}) as Prisma.InputJsonValue, consentItems: (dto.consentItems ?? {}) as Prisma.InputJsonValue,
      status, submittedAt: status === MentorshipApplicationStatus.SUBMITTED ? new Date() : undefined
    };
  }

  private applicationUpdateData(dto: UpdateMentorshipApplicationDto): Prisma.MentorshipApplicationUncheckedUpdateInput {
    const fields = this.applicationFields(dto);
    return { ...fields, cohortId: dto.cohortId, applicantUserId: dto.applicantUserId, role: dto.role, source: dto.source };
  }

  private applicationFields(dto: Partial<CreateMentorshipApplicationDto>) {
    const json = (value: unknown) => value as Prisma.InputJsonValue | undefined;
    return {
      firstName: dto.firstName?.trim(), lastName: dto.lastName?.trim(), email: dto.email?.trim().toLowerCase(), phone: dto.phone?.trim(), timeZone: dto.timeZone,
      languages: json(dto.languages), locationRegion: dto.locationRegion?.trim(), institution: dto.institution?.trim(), degreeProgram: dto.degreeProgram?.trim(), major: dto.major?.trim(), minor: dto.minor?.trim(), academicLevel: dto.academicLevel?.trim(), graduationYear: dto.graduationYear, gpa: dto.gpa,
      disciplines: json(dto.disciplines), expertise: json(dto.expertise), mentoringCapabilities: json(dto.mentoringCapabilities), supportNeeds: json(dto.supportNeeds), careerInterests: json(dto.careerInterests), availability: json(dto.availability), meetingMode: dto.meetingMode, hoursPerWeek: dto.hoursPerWeek, maximumMentees: dto.maximumMentees,
      primaryObjective: dto.primaryObjective?.trim(), goals: dto.goals?.trim(), currentChallenge: dto.currentChallenge?.trim(), motivation: dto.motivation?.trim(), experience: dto.experience?.trim(), consentItems: json(dto.consentItems)
    };
  }

  private validateApplication(dto: { firstName?: string | null; lastName?: string | null; email?: string | null; timeZone?: string | null; languages?: unknown; role?: MentorshipParticipantRole; graduationYear?: number | null; expertise?: unknown; mentoringCapabilities?: unknown; supportNeeds?: unknown; goals?: string | null }, submitted: boolean) {
    if (!submitted) return;
    if (!dto.firstName || !dto.lastName || !dto.email || !dto.timeZone || !Array.isArray(dto.languages) || !dto.languages.length) throw new BadRequestException("Submitted applications require identity, email, time zone, and at least one language.");
    if ((dto.role === MentorshipParticipantRole.MENTOR || dto.role === MentorshipParticipantRole.TUTOR) && (!dto.expertise || (typeof dto.expertise === "object" && !Array.isArray(dto.expertise) && !Object.keys(dto.expertise).length)) && (!Array.isArray(dto.mentoringCapabilities) || !dto.mentoringCapabilities.length)) throw new BadRequestException(`${dto.role === MentorshipParticipantRole.TUTOR ? "Tutor" : "Mentor"} applications require expertise or capabilities.`);
    if (dto.role === MentorshipParticipantRole.MENTEE && (!Array.isArray(dto.supportNeeds) || !dto.supportNeeds.length) && !dto.goals) throw new BadRequestException("Mentee applications require support needs or a mentorship goal.");
    if (dto.role === MentorshipParticipantRole.MENTEE && !dto.graduationYear) throw new BadRequestException("Mentee applications require a graduation year.");
  }

  private validateDecision(role: MentorshipParticipantRole, decision: MentorshipApplicationStatus) {
    const common = [MentorshipApplicationStatus.UNDER_REVIEW, MentorshipApplicationStatus.NEEDS_INFORMATION, MentorshipApplicationStatus.REJECTED, MentorshipApplicationStatus.INELIGIBLE];
    const providerRole = role === MentorshipParticipantRole.MENTOR || role === MentorshipParticipantRole.TUTOR;
    const allowed = providerRole ? [...common, MentorshipApplicationStatus.APPROVED] : [...common, MentorshipApplicationStatus.ELIGIBLE];
    if (!new Set<MentorshipApplicationStatus>(allowed).has(decision)) throw new BadRequestException(providerRole ? "Mentor and tutor applications must be approved or rejected." : "Mentee applications must be marked eligible or ineligible.");
  }

  private cohortCreateData(programId: string, dto: CreateMentorshipCohortDto): Prisma.MentorshipCohortUncheckedCreateInput {
    return {
      programId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim(),
      status: dto.status,
      applicationOpenDate: this.toDate(dto.applicationOpenDate),
      applicationCloseDate: this.toDate(dto.applicationCloseDate),
      mentorApplicationOpenDate: this.toDate(dto.mentorApplicationOpenDate),
      mentorApplicationCloseDate: this.toDate(dto.mentorApplicationCloseDate),
      menteeApplicationOpenDate: this.toDate(dto.menteeApplicationOpenDate),
      menteeApplicationCloseDate: this.toDate(dto.menteeApplicationCloseDate),
      programStartDate: new Date(dto.programStartDate),
      programEndDate: new Date(dto.programEndDate),
      targetMentors: dto.targetMentors,
      maximumMentors: dto.maximumMentors,
      targetTutors: dto.targetTutors,
      maximumTutors: dto.maximumTutors,
      targetMentees: dto.targetMentees,
      maximumMentees: dto.maximumMentees,
      waitlistEnabled: dto.waitlistEnabled,
      mentorEligibility: (dto.mentorEligibility ?? {}) as Prisma.InputJsonValue,
      tutorEligibility: (dto.tutorEligibility ?? {}) as Prisma.InputJsonValue,
      menteeEligibility: (dto.menteeEligibility ?? {}) as Prisma.InputJsonValue,
      minimumSessions: dto.minimumSessions,
      expectedHours: dto.expectedHours,
      sessionFrequency: dto.sessionFrequency?.trim(),
      matchingEnabled: dto.matchingEnabled,
      recommendationCount: dto.recommendationCount,
      adminApprovalRequired: true,
      matchingWeights: (dto.matchingWeights ?? defaultMatchingWeights) as Prisma.InputJsonValue,
      stipendEnabled: dto.stipendEnabled,
      stipendAmountCents: dto.stipendAmountCents,
      stipendPaymentModel: dto.stipendPaymentModel?.trim(),
      stipendRequirements: dto.stipendRequirements as Prisma.InputJsonValue | undefined
    };
  }

  private cohortUpdateData(dto: UpdateMentorshipCohortDto): Prisma.MentorshipCohortUpdateInput {
    return {
      name: dto.name?.trim(),
      code: dto.code?.trim().toUpperCase(),
      description: dto.description?.trim(),
      status: dto.status,
      applicationOpenDate: this.toDate(dto.applicationOpenDate),
      applicationCloseDate: this.toDate(dto.applicationCloseDate),
      mentorApplicationOpenDate: this.toDate(dto.mentorApplicationOpenDate),
      mentorApplicationCloseDate: this.toDate(dto.mentorApplicationCloseDate),
      menteeApplicationOpenDate: this.toDate(dto.menteeApplicationOpenDate),
      menteeApplicationCloseDate: this.toDate(dto.menteeApplicationCloseDate),
      programStartDate: this.toDate(dto.programStartDate),
      programEndDate: this.toDate(dto.programEndDate),
      targetMentors: dto.targetMentors,
      maximumMentors: dto.maximumMentors,
      targetTutors: dto.targetTutors,
      maximumTutors: dto.maximumTutors,
      targetMentees: dto.targetMentees,
      maximumMentees: dto.maximumMentees,
      waitlistEnabled: dto.waitlistEnabled,
      mentorEligibility: dto.mentorEligibility as Prisma.InputJsonValue | undefined,
      tutorEligibility: dto.tutorEligibility as Prisma.InputJsonValue | undefined,
      menteeEligibility: dto.menteeEligibility as Prisma.InputJsonValue | undefined,
      minimumSessions: dto.minimumSessions,
      expectedHours: dto.expectedHours,
      sessionFrequency: dto.sessionFrequency?.trim(),
      matchingEnabled: dto.matchingEnabled,
      recommendationCount: dto.recommendationCount,
      adminApprovalRequired: true,
      matchingWeights: dto.matchingWeights as Prisma.InputJsonValue | undefined,
      stipendEnabled: dto.stipendEnabled,
      stipendAmountCents: dto.stipendAmountCents,
      stipendPaymentModel: dto.stipendPaymentModel?.trim(),
      stipendRequirements: dto.stipendRequirements as Prisma.InputJsonValue | undefined
    };
  }

  private validateCohort(dto: CreateMentorshipCohortDto | Record<string, unknown>) {
    const value = dto as CreateMentorshipCohortDto;
    this.assertDateOrder(value.programStartDate, value.programEndDate, "Program end date must be after its start date.");
    this.assertOptionalDateOrder(value.applicationOpenDate, value.applicationCloseDate, "Application close date must be after its open date.");
    this.assertOptionalDateOrder(value.mentorApplicationOpenDate, value.mentorApplicationCloseDate, "Mentor application close date must be after its open date.");
    this.assertOptionalDateOrder(value.menteeApplicationOpenDate, value.menteeApplicationCloseDate, "Mentee application close date must be after its open date.");
    if (value.maximumMentors !== undefined && value.targetMentors !== undefined && value.targetMentors > value.maximumMentors) {
      throw new BadRequestException("Target mentors cannot exceed maximum mentors.");
    }
    if (value.maximumMentees !== undefined && value.targetMentees !== undefined && value.targetMentees > value.maximumMentees) {
      throw new BadRequestException("Target mentees cannot exceed maximum mentees.");
    }
    if (value.maximumTutors !== undefined && value.targetTutors !== undefined && value.targetTutors > value.maximumTutors) {
      throw new BadRequestException("Target tutors cannot exceed maximum tutors.");
    }
    if (value.matchingWeights) {
      const weights = Object.values(value.matchingWeights);
      if (!weights.length || weights.some((weight) => typeof weight !== "number" || weight < 0) || weights.reduce((sum, weight) => sum + weight, 0) !== 100) {
        throw new BadRequestException("Matching weights must be non-negative numbers totaling 100.");
      }
    }
    if (value.stipendEnabled && value.stipendAmountCents === undefined) {
      throw new BadRequestException("A stipend amount is required when stipends are enabled.");
    }
  }

  private assertDateOrder(start: string, end: string, message: string) {
    if (new Date(start) >= new Date(end)) throw new BadRequestException(message);
  }

  private assertOptionalDateOrder(start: string | undefined, end: string | undefined, message: string) {
    if (start && end) this.assertDateOrder(start, end, message);
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private cleanTags(tags?: string[]) {
    return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  }

  private dateValue(value: string | undefined, fallback: Date | null) {
    return value ?? fallback?.toISOString();
  }

  private async publicProgram(token: string, preview = false) {
    const now = new Date();
    const program = await this.prisma.mentorshipProgram.findFirst({
      where: {
        OR: [
          { publicApplicationToken: token },
          { cohorts: { some: { id: token } } }
        ],
        publicApplicationsEnabled: true,
        applicationsEnabled: true,
        status: MentorshipProgramStatus.ACTIVE,
        organization: { enabledAddOns: { has: "MENTORSHIP" } }
      },
      include: {
        organization: { select: { name: true, displayName: true, logoUrl: true, supportEmail: true } },
        cohorts: {
          where: { status: MentorshipCohortStatus.APPLICATIONS_OPEN },
          orderBy: { programStartDate: "asc" }
        }
      }
    });
    if (!program) throw new NotFoundException("This public mentorship application link is unavailable.");
    const cohortSpecificLink = program.publicApplicationToken !== token;
    program.cohorts = program.cohorts.filter((cohort) => (!cohortSpecificLink || cohort.id === token) && (preview || [MentorshipParticipantRole.MENTOR, MentorshipParticipantRole.TUTOR, MentorshipParticipantRole.MENTEE].some((role) => this.roleWindowOpen(cohort, role, now))));
    if (!program.cohorts.length) throw new NotFoundException("This cohort application link is not currently active.");
    return program;
  }

  private roleWindowOpen(cohort: { applicationOpenDate: Date | null; applicationCloseDate: Date | null; mentorApplicationOpenDate: Date | null; mentorApplicationCloseDate: Date | null; menteeApplicationOpenDate: Date | null; menteeApplicationCloseDate: Date | null }, role: MentorshipParticipantRole, now = new Date()) {
    const start = role === MentorshipParticipantRole.MENTOR ? cohort.mentorApplicationOpenDate ?? cohort.applicationOpenDate : role === MentorshipParticipantRole.MENTEE ? cohort.menteeApplicationOpenDate ?? cohort.applicationOpenDate : cohort.applicationOpenDate;
    const end = role === MentorshipParticipantRole.MENTOR ? cohort.mentorApplicationCloseDate ?? cohort.applicationCloseDate : role === MentorshipParticipantRole.MENTEE ? cohort.menteeApplicationCloseDate ?? cohort.applicationCloseDate : cohort.applicationCloseDate;
    return (!start || start <= now) && (!end || end >= now);
  }

  private roleLabel(role: MentorshipParticipantRole) {
    return role === MentorshipParticipantRole.MENTEE ? "mentee" : role === MentorshipParticipantRole.TUTOR ? "tutor" : "mentor";
  }

  private portalParticipantWhere(user: AuthenticatedUser): Prisma.MentorshipParticipantWhereInput {
    return { OR: [{ userId: user.sub }, { application: { applicantUserId: user.sub } }, { application: { email: user.email.trim().toLowerCase() } }] };
  }

  private async findPortalParticipant(id: string, user: AuthenticatedUser) {
    const participant = await this.prisma.mentorshipParticipant.findFirst({ where: { id, ...this.portalParticipantWhere(user), program: { organization: { enabledAddOns: { has: "MENTORSHIP" } } } }, include: { program: { select: { organization: { select: { id: true } } } } } });
    if (!participant) throw new NotFoundException("Mentorship participation not found.");
    return participant;
  }

  private async findPortalSession(id: string, user: AuthenticatedUser) {
    const participants = await this.prisma.mentorshipParticipant.findMany({ where: this.portalParticipantWhere(user), select: { id: true } });
    const participantIds = participants.map((participant) => participant.id);
    const session = participantIds.length ? await this.prisma.mentorshipSession.findFirst({ where: { id, relationship: { OR: [{ menteeParticipantId: { in: participantIds } }, { providerParticipantId: { in: participantIds } }] } }, include: { relationship: { include: { program: { select: { organizationId: true, organization: { select: { id: true, enabledAddOns: true } } } } } } } }) : null;
    if (!session || !session.relationship.program.organization.enabledAddOns.includes("MENTORSHIP")) throw new NotFoundException("Mentorship session not found.");
    return session;
  }

  private async queueRelationshipNotice(relationshipId: string, type: MentorshipNotificationType, title: string, message: string, dedupePrefix: string, onlyParticipantId?: string, sendEmail = true) {
    const relationship = await this.prisma.mentorshipRelationship.findFirst({
      where: { id: relationshipId },
      include: {
        program: { select: { id: true, organizationId: true } },
        mentee: { select: { id: true, userId: true, applicationId: true, application: { select: { email: true } } } },
        provider: { select: { id: true, userId: true, applicationId: true, application: { select: { email: true } } } }
      }
    });
    if (!relationship) return 0;
    const recipients = [relationship.mentee, relationship.provider].filter((participant) => !onlyParticipantId || participant.id === onlyParticipantId);
    let delivered = 0;
    for (const recipient of recipients) {
      const dedupeKey = `${dedupePrefix}:${recipient.id}`;
      if (await this.prisma.mentorshipNotification.findUnique({ where: { dedupeKey }, select: { id: true } })) continue;
      await this.prisma.mentorshipNotification.create({
        data: {
          organizationId: relationship.program.organizationId,
          programId: relationship.program.id,
          applicationId: recipient.applicationId,
          relationshipId,
          recipientUserId: recipient.userId,
          type,
          title,
          message,
          actionUrl: `/my-mentorship?classroom=${relationshipId}`,
          dedupeKey
        }
      });
      delivered += 1;
      if (sendEmail) {
        const queued = await this.prisma.mentorshipEmailOutbox.create({ data: { organizationId: relationship.program.organizationId, programId: relationship.program.id, applicationId: recipient.applicationId, recipient: recipient.application.email, subject: title, body: `${message}\n\nOpen your Pilye classroom for details.` } });
        await this.dispatchEmailOutbox(queued.id);
      }
    }
    return delivered;
  }

  private async dispatchEmailOutbox(id: string): Promise<"sent" | "skipped" | "failed"> {
    const queued = await this.prisma.mentorshipEmailOutbox.findUnique({ where: { id } });
    if (!queued || queued.sentAt) return "skipped";
    try {
      const resendApiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
      const webhookEndpoint = this.config.get<string>("EMAIL_DELIVERY_URL")?.trim();
      let response: Response;
      if (resendApiKey) {
        const from = this.config.get<string>("EMAIL_FROM")?.trim();
        if (!from) throw new Error("EMAIL_FROM is required when RESEND_API_KEY is configured.");
        const replyTo = this.config.get<string>("EMAIL_REPLY_TO")?.trim();
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
            "Idempotency-Key": `pilye/${queued.id}`
          },
          body: JSON.stringify({
            from,
            to: [queued.recipient],
            subject: queued.subject,
            text: queued.body,
            ...(replyTo ? { reply_to: replyTo } : {})
          })
        });
      } else if (webhookEndpoint) {
        const token = this.config.get<string>("EMAIL_DELIVERY_TOKEN")?.trim();
        response = await fetch(webhookEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ to: queued.recipient, subject: queued.subject, text: queued.body, referenceId: queued.id })
        });
      } else {
        throw new Error("Email delivery is not configured.");
      }
      if (!response.ok) throw new Error(`Email delivery returned ${response.status}.`);
      await this.prisma.mentorshipEmailOutbox.update({ where: { id }, data: { sentAt: new Date(), lastError: null } });
      return "sent";
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error.";
      await this.prisma.mentorshipEmailOutbox.update({ where: { id }, data: { lastError: message } }).catch(() => undefined);
      return "failed";
    }
  }

  private audit(user: AuthenticatedUser, organizationId: string, action: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { organizationId, actorId: user.sub, action, entityType, entityId, metadata } });
  }
}
