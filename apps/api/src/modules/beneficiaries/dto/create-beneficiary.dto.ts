import { BeneficiaryProgramStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateBeneficiaryDto {
  @IsString()
  organizationId!: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  country!: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsEnum(BeneficiaryProgramStatus)
  @IsOptional()
  programStatus?: BeneficiaryProgramStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  assignedMentorId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedProjectIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedWorkshopIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedProgramIds?: string[];

  @IsDateString()
  onboardingDate!: string;
}
