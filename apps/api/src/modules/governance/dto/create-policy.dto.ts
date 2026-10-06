import { PolicyStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreatePolicyDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  approvedById?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsString()
  @IsOptional()
  linkedFileId?: string;
}
