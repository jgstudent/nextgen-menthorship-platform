import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateMentorshipCohortDto } from "./dto/create-mentorship-cohort.dto";
import { CreateMentorshipApplicationDto } from "./dto/create-mentorship-application.dto";
import { CreateMentorshipGoalDto } from "./dto/create-mentorship-goal.dto";
import { CreateMentorshipProgressUpdateDto } from "./dto/create-mentorship-progress-update.dto";
import { CreateMentorshipProgramDto } from "./dto/create-mentorship-program.dto";
import { CreateMentorshipSessionDto } from "./dto/create-mentorship-session.dto";
import { DecideMentorshipMatchDto } from "./dto/decide-mentorship-match.dto";
import { ReviewMentorshipApplicationDto } from "./dto/review-mentorship-application.dto";
import { UpdateMentorshipApplicationDto } from "./dto/update-mentorship-application.dto";
import { UpdateMentorshipCohortDto } from "./dto/update-mentorship-cohort.dto";
import { UpdateMentorshipGoalDto } from "./dto/update-mentorship-goal.dto";
import { UpdateMentorshipParticipantDto } from "./dto/update-mentorship-participant.dto";
import { UpdateMentorshipProgramDto } from "./dto/update-mentorship-program.dto";
import { UpdateMentorshipSessionDto } from "./dto/update-mentorship-session.dto";
import { MentorshipService } from "./mentorship.service";
import { AssignMentorshipResourceDto } from "./dto/assign-mentorship-resource.dto";
import { CreateMentorshipResourceDto } from "./dto/create-mentorship-resource.dto";
import { UpdateMentorshipResourceDto } from "./dto/update-mentorship-resource.dto";
import { ReviewMentorshipServiceHourDto } from "./dto/review-mentorship-service-hour.dto";
import { UpdateMentorshipStipendDecisionDto } from "./dto/update-mentorship-stipend-decision.dto";
import { DeleteMentorshipProgramDto } from "./dto/delete-mentorship-program.dto";
import { CreateMentorshipAssignmentDto } from "./dto/create-mentorship-assignment.dto";
import { UpdateMentorshipAssignmentDto } from "./dto/update-mentorship-assignment.dto";
import { CreateMentorshipNoteDto } from "./dto/create-mentorship-note.dto";
import { RetryMentorshipEmailOutboxDto } from "./dto/retry-mentorship-email-outbox.dto";

@Controller("mentorship")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE)
export class MentorshipController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get("foundation")
  foundation() {
    return this.mentorship.foundation();
  }

  @Get("programs")
  findPrograms() {
    return this.mentorship.findPrograms();
  }

  @Get("programs/:programId")
  findProgram(@Param("programId") programId: string) {
    return this.mentorship.findProgram(programId);
  }

  @Post("programs")
  createProgram(@Body() dto: CreateMentorshipProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createProgram(dto, user);
  }

  @Patch("programs/:programId")
  updateProgram(@Param("programId") programId: string, @Body() dto: UpdateMentorshipProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateProgram(programId, dto, user);
  }

  @Delete("programs/:programId")
  archiveProgram(@Param("programId") programId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.archiveProgram(programId, user);
  }

  @Delete("programs/:programId/permanent")
  @Roles(UserRole.SUPER_ADMIN)
  deleteProgramPermanently(@Param("programId") programId: string, @Body() dto: DeleteMentorshipProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.deleteProgramPermanently(programId, dto.confirmation, user);
  }

  @Post("programs/:programId/cohorts")
  createCohort(@Param("programId") programId: string, @Body() dto: CreateMentorshipCohortDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createCohort(programId, dto, user);
  }

  @Patch("programs/:programId/cohorts/:cohortId")
  updateCohort(@Param("programId") programId: string, @Param("cohortId") cohortId: string, @Body() dto: UpdateMentorshipCohortDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateCohort(programId, cohortId, dto, user);
  }

  @Delete("programs/:programId/cohorts/:cohortId")
  archiveCohort(@Param("programId") programId: string, @Param("cohortId") cohortId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.archiveCohort(programId, cohortId, user);
  }

  @Get("programs/:programId/applications")
  findApplications(@Param("programId") programId: string) {
    return this.mentorship.findApplications(programId);
  }

  @Get("programs/:programId/notifications")
  findNotifications(@Param("programId") programId: string) {
    return this.mentorship.findNotifications(programId);
  }

  @Post("programs/:programId/notifications/:notificationId/read")
  markNotificationRead(@Param("programId") programId: string, @Param("notificationId") notificationId: string) {
    return this.mentorship.markNotificationRead(programId, notificationId);
  }

  @Post("programs/:programId/applications")
  createApplication(@Param("programId") programId: string, @Body() dto: CreateMentorshipApplicationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createApplication(programId, dto, user);
  }

  @Patch("programs/:programId/applications/:applicationId")
  updateApplication(@Param("programId") programId: string, @Param("applicationId") applicationId: string, @Body() dto: UpdateMentorshipApplicationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateApplication(programId, applicationId, dto, user);
  }

  @Post("programs/:programId/applications/:applicationId/submit")
  submitApplication(@Param("programId") programId: string, @Param("applicationId") applicationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.submitApplication(programId, applicationId, user);
  }

  @Post("programs/:programId/applications/:applicationId/review")
  @Roles(UserRole.SUPER_ADMIN)
  reviewApplication(@Param("programId") programId: string, @Param("applicationId") applicationId: string, @Body() dto: ReviewMentorshipApplicationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.reviewApplication(programId, applicationId, dto, user);
  }

  @Get("programs/:programId/participants")
  findParticipants(@Param("programId") programId: string) {
    return this.mentorship.findParticipants(programId);
  }

  @Patch("programs/:programId/participants/:participantId")
  updateParticipant(@Param("programId") programId: string, @Param("participantId") participantId: string, @Body() dto: UpdateMentorshipParticipantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateParticipant(programId, participantId, dto, user);
  }

  @Get("programs/:programId/matches")
  findMatches(@Param("programId") programId: string) {
    return this.mentorship.findMatches(programId);
  }

  @Get("programs/:programId/relationships")
  findRelationships(@Param("programId") programId: string) {
    return this.mentorship.findRelationships(programId);
  }

  @Get("programs/:programId/monitoring")
  monitoring(@Param("programId") programId: string) {
    return this.mentorship.getMonitoringReport(programId);
  }

  @Get("programs/:programId/resources")
  findResources(@Param("programId") programId: string) {
    return this.mentorship.findResources(programId);
  }

  @Get("programs/:programId/service-hours")
  findServiceHours(@Param("programId") programId: string) {
    return this.mentorship.findServiceHours(programId);
  }

  @Post("programs/:programId/service-hours/:entryId/review")
  reviewServiceHour(@Param("programId") programId: string, @Param("entryId") entryId: string, @Body() dto: ReviewMentorshipServiceHourDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.reviewServiceHour(programId, entryId, dto, user);
  }

  @Post("programs/:programId/participants/:participantId/stipend-decision")
  updateStipendDecision(@Param("programId") programId: string, @Param("participantId") participantId: string, @Body() dto: UpdateMentorshipStipendDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateStipendDecision(programId, participantId, dto, user);
  }

  @Post("programs/:programId/resources")
  createResource(@Param("programId") programId: string, @Body() dto: CreateMentorshipResourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createResource(programId, dto, user);
  }

  @Patch("programs/:programId/resources/:resourceId")
  updateResource(@Param("programId") programId: string, @Param("resourceId") resourceId: string, @Body() dto: UpdateMentorshipResourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateResource(programId, resourceId, dto, user);
  }

  @Delete("programs/:programId/resources/:resourceId")
  archiveResource(@Param("programId") programId: string, @Param("resourceId") resourceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.archiveResource(programId, resourceId, user);
  }

  @Post("programs/:programId/resources/:resourceId/assignments")
  assignResource(@Param("programId") programId: string, @Param("resourceId") resourceId: string, @Body() dto: AssignMentorshipResourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.assignResource(programId, resourceId, dto, user);
  }

  @Post("programs/:programId/relationships/:relationshipId/goals")
  createGoal(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Body() dto: CreateMentorshipGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createGoal(programId, relationshipId, dto, user);
  }

  @Patch("programs/:programId/relationships/:relationshipId/goals/:goalId")
  updateGoal(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Param("goalId") goalId: string, @Body() dto: UpdateMentorshipGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateGoal(programId, relationshipId, goalId, dto, user);
  }

  @Post("programs/:programId/relationships/:relationshipId/sessions")
  createSession(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Body() dto: CreateMentorshipSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createSession(programId, relationshipId, dto, user);
  }

  @Patch("programs/:programId/relationships/:relationshipId/sessions/:sessionId")
  updateSession(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Param("sessionId") sessionId: string, @Body() dto: UpdateMentorshipSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateSession(programId, relationshipId, sessionId, dto, user);
  }

  @Post("programs/:programId/relationships/:relationshipId/progress")
  createProgressUpdate(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Body() dto: CreateMentorshipProgressUpdateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createProgressUpdate(programId, relationshipId, dto, user);
  }

  @Post("programs/:programId/relationships/:relationshipId/assignments")
  createAssignment(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Body() dto: CreateMentorshipAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createAssignment(programId, relationshipId, dto, user);
  }

  @Patch("programs/:programId/relationships/:relationshipId/assignments/:assignmentId")
  updateAssignment(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Param("assignmentId") assignmentId: string, @Body() dto: UpdateMentorshipAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updateAssignment(programId, relationshipId, assignmentId, dto, user);
  }

  @Post("programs/:programId/relationships/:relationshipId/notes")
  createNote(@Param("programId") programId: string, @Param("relationshipId") relationshipId: string, @Body() dto: CreateMentorshipNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createNote(programId, relationshipId, dto, user);
  }

  @Post("programs/:programId/notifications/process")
  processNotifications(@Param("programId") programId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.processNotifications(programId, user);
  }

  @Post("programs/:programId/notifications/email-outbox/retry")
  @Roles(UserRole.SUPER_ADMIN)
  retryPendingEmails(@Param("programId") programId: string, @Body() dto: RetryMentorshipEmailOutboxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.retryPendingEmails(programId, dto.recipients, user);
  }

  @Post("programs/:programId/cohorts/:cohortId/matches/generate")
  generateMatches(@Param("programId") programId: string, @Param("cohortId") cohortId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.generateMatches(programId, cohortId, user);
  }

  @Post("programs/:programId/matches/:matchId/decision")
  decideMatch(@Param("programId") programId: string, @Param("matchId") matchId: string, @Body() dto: DecideMentorshipMatchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.decideMatch(programId, matchId, dto, user);
  }
}
