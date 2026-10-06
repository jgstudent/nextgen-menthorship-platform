import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateWorkshopDto } from "./dto/create-workshop.dto";
import { UpdateWorkshopDto } from "./dto/update-workshop.dto";
import { WorkshopsService } from "./workshops.service";

@Controller("workshops")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkshopsController {
  constructor(private readonly workshops: WorkshopsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  create(@Body() dto: CreateWorkshopDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workshops.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workshops.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workshops.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateWorkshopDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workshops.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workshops.remove(id, user);
  }
}
