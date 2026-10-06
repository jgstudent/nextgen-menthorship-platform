import { MentorshipCohortStatus } from "@prisma/client";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class CreateMentorshipCohortDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  @MaxLength(24)
  code!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(MentorshipCohortStatus)
  @IsOptional()
  status?: MentorshipCohortStatus;

  @IsDateString()
  @IsOptional()
  applicationOpenDate?: string;

  @IsDateString()
  @IsOptional()
  applicationCloseDate?: string;

  @IsDateString()
  @IsOptional()
  mentorApplicationOpenDate?: string;

  @IsDateString()
  @IsOptional()
  mentorApplicationCloseDate?: string;

  @IsDateString()
  @IsOptional()
  menteeApplicationOpenDate?: string;

  @IsDateString()
  @IsOptional()
  menteeApplicationCloseDate?: string;

  @IsDateString()
  programStartDate!: string;

  @IsDateString()
  programEndDate!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMentors?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maximumMentors?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetTutors?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maximumTutors?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMentees?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maximumMentees?: number;

  @IsBoolean()
  @IsOptional()
  waitlistEnabled?: boolean;

  @IsObject()
  @IsOptional()
  mentorEligibility?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  tutorEligibility?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  menteeEligibility?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimumSessions?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  expectedHours?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  sessionFrequency?: string;

  @IsBoolean()
  @IsOptional()
  matchingEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  recommendationCount?: number;

  @IsObject()
  @IsOptional()
  matchingWeights?: Record<string, number>;

  @IsBoolean()
  @IsOptional()
  stipendEnabled?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  stipendAmountCents?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  stipendPaymentModel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  stipendRequirements?: string[];
}
