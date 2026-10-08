import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CancelPortalSessionDto } from "./dto/cancel-portal-session.dto";
import { CreatePortalFeedbackDto } from "./dto/create-portal-feedback.dto";
import { ReschedulePortalSessionDto } from "./dto/reschedule-portal-session.dto";
import { UpdatePortalAvailabilityDto } from "./dto/update-portal-availability.dto";
import { MentorshipService } from "./mentorship.service";
import { UpdatePortalResourceAssignmentDto } from "./dto/update-portal-resource-assignment.dto";
import { CreatePortalServiceHourDto } from "./dto/create-portal-service-hour.dto";
import { CreatePortalNoteDto } from "./dto/create-portal-note.dto";
import { UpdatePortalAssignmentDto } from "./dto/update-portal-assignment.dto";

@Controller("mentorship/portal")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER, UserRole.BENEFICIARY)
export class MentorshipPortalController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get()
  portal(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.findParticipantPortal(user);
  }

  @Patch("availability")
  updateAvailability(@Body() dto: UpdatePortalAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updatePortalAvailability(dto, user);
  }

  @Post("sessions/:sessionId/reschedule")
  reschedule(@Param("sessionId") sessionId: string, @Body() dto: ReschedulePortalSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.reschedulePortalSession(sessionId, dto, user);
  }

  @Post("sessions/:sessionId/cancel")
  cancel(@Param("sessionId") sessionId: string, @Body() dto: CancelPortalSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.cancelPortalSession(sessionId, dto, user);
  }

  @Post("sessions/:sessionId/feedback")
  feedback(@Param("sessionId") sessionId: string, @Body() dto: CreatePortalFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createPortalFeedback(sessionId, dto, user);
  }

  @Patch("resources/:assignmentId")
  updateResourceAssignment(@Param("assignmentId") assignmentId: string, @Body() dto: UpdatePortalResourceAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updatePortalResourceAssignment(assignmentId, dto, user);
  }

  @Post("service-hours")
  createServiceHour(@Body() dto: CreatePortalServiceHourDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createPortalServiceHour(dto, user);
  }

  @Patch("assignments/:assignmentId")
  updateAssignment(@Param("assignmentId") assignmentId: string, @Body() dto: UpdatePortalAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.updatePortalAssignment(assignmentId, dto, user);
  }

  @Post("relationships/:relationshipId/notes")
  createNote(@Param("relationshipId") relationshipId: string, @Body() dto: CreatePortalNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorship.createPortalNote(relationshipId, dto, user);
  }
}
