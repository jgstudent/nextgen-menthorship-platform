import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApprovalActionDto } from "./dto/approval-action.dto";
import { CreateApprovalCommentDto } from "./dto/create-approval-comment.dto";
import { CreateApprovalDto } from "./dto/create-approval.dto";
import { UpdateApprovalDto } from "./dto/update-approval.dto";
import { ApprovalsService } from "./approvals.service";

@Controller("approvals")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.approvals.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateApprovalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.remove(id, user);
  }

  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "SUBMITTED", "PENDING_REVIEW", user, dto.notes);
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  approve(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "APPROVED", "APPROVED", user, dto.notes);
  }

  @Post(":id/reject")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  reject(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "REJECTED", "REJECTED", user, dto.notes);
  }

  @Post(":id/request-changes")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  requestChanges(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "CHANGES_REQUESTED", "CHANGES_REQUESTED", user, dto.notes);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "CANCELLED", "CANCELLED", user, dto.notes);
  }

  @Post(":id/reopen")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  reopen(@Param("id") id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.transition(id, "REOPENED", "IN_REVIEW", user, dto.notes);
  }

  @Post(":id/comments")
  createComment(@Param("id") id: string, @Body() dto: CreateApprovalCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.createComment(id, dto, user);
  }

  @Get(":id/comments")
  comments(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.comments(id, user);
  }

  @Get(":id/history")
  history(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.history(id, user);
  }
}
