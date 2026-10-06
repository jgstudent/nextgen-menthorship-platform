import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BeneficiariesService } from "./beneficiaries.service";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";
import { UpdateBeneficiaryDto } from "./dto/update-beneficiary.dto";

@Controller("beneficiaries")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiaries: BeneficiariesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  create(@Body() dto: CreateBeneficiaryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateBeneficiaryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.remove(id, user);
  }

  @Post(":id/create-account")
  @Roles(UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER)
  createAccount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.beneficiaries.createAccount(id, user);
  }
}
