import { ProgramStatus, ProgramVisibility } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateProgramDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category!: string;

  @IsEnum(ProgramVisibility)
  @IsOptional()
  visibility?: ProgramVisibility;

  @IsEnum(ProgramStatus)
  @IsOptional()
  status?: ProgramStatus;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  workspaceId!: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
