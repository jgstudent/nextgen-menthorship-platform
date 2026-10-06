import { ResolutionStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateResolutionDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ResolutionStatus)
  @IsOptional()
  status?: ResolutionStatus;

  @IsString()
  @IsOptional()
  resolutionNumber?: string;

  @IsString()
  @IsOptional()
  meetingId?: string;

  @IsString()
  @IsOptional()
  approvalId?: string;

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsDateString()
  @IsOptional()
  approvedAt?: string;
}
