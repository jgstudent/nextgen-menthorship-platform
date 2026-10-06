import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateProgramDto } from "./dto/create-program.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";
import { ProgramsService } from "./programs.service";

@Controller("programs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  create(@Body() dto: CreateProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.programs.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.programs.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programs.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.programs.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programs.remove(id, user);
  }
}
