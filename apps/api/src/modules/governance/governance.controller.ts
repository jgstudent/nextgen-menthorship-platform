import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePolicyDto } from "./dto/create-policy.dto";
import { CreateResolutionDto } from "./dto/create-resolution.dto";
import { UpdatePolicyDto } from "./dto/update-policy.dto";
import { UpdateResolutionDto } from "./dto/update-resolution.dto";
import { GovernanceService } from "./governance.service";

@Controller("governance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.summary(user);
  }

  @Get("meetings")
  meetings(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.meetings(user);
  }

  @Get("approvals")
  approvals(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.approvals(user);
  }

  @Get("files")
  files(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.files(user);
  }

  @Get("documents")
  documents(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.documents(user);
  }

  @Get("policies")
  policies(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.policies(user);
  }

  @Post("policies")
  createPolicy(@Body() dto: CreatePolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.governance.createPolicy(dto, user);
  }

  @Patch("policies/:id")
  updatePolicy(@Param("id") id: string, @Body() dto: UpdatePolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.governance.updatePolicy(id, dto, user);
  }

  @Get("resolutions")
  resolutions(@CurrentUser() user: AuthenticatedUser) {
    return this.governance.resolutions(user);
  }

  @Post("resolutions")
  createResolution(@Body() dto: CreateResolutionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.governance.createResolution(dto, user);
  }

  @Patch("resolutions/:id")
  updateResolution(@Param("id") id: string, @Body() dto: UpdateResolutionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.governance.updateResolution(id, dto, user);
  }
}
