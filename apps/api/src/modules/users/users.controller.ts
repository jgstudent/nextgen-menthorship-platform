import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.update(id, dto, actor);
  }

  @Post(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setStatus(id, UserStatus.SUSPENDED, actor);
  }

  @Post(":id/reactivate")
  reactivate(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setStatus(id, UserStatus.ACTIVE, actor);
  }

  @Post(":id/reset-password")
  @Roles(UserRole.SUPER_ADMIN)
  resetPassword(@Param("id") id: string, @Body() dto: ResetUserPasswordDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.resetPassword(id, dto, actor);
  }

  @Post(":id/invite")
  invite(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.invitePlaceholder(id, actor);
  }
}
