import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ConvertActionItemDto } from "./dto/convert-action-item.dto";
import { CreateActionItemDto } from "./dto/create-action-item.dto";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";
import { MeetingsService } from "./meetings.service";

@Controller("meetings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.meetings.findAll(user);
  }

  @Get("members")
  findMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.meetings.findMembers(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.remove(id, user);
  }

  @Post(":id/action-items")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER)
  createActionItem(@Param("id") id: string, @Body() dto: CreateActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.createActionItem(id, dto, user);
  }

  @Post(":id/action-items/:actionItemId/convert-to-task")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  convertActionItem(@Param("id") id: string, @Param("actionItemId") actionItemId: string, @Body() dto: ConvertActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.convertActionItemToTask(id, actionItemId, dto, user);
  }
}
