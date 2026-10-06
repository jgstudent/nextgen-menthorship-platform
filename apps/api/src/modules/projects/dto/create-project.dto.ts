import { ProjectStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class CreateProjectDto {
  @IsString()
  organizationId!: string;

  @IsString()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  programId?: string;

  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
