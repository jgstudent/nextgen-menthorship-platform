import { MentorshipMeetingMode, MentorshipProgramStatus } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class CreateMentorshipProgramDto {
  @IsString()
  organizationId!: string;

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

  @IsEnum(MentorshipProgramStatus)
  @IsOptional()
  status?: MentorshipProgramStatus;

  @IsString()
  @MaxLength(80)
  programType!: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  defaultDuration?: string;

  @IsEnum(MentorshipMeetingMode)
  @IsOptional()
  defaultMeetingMode?: MentorshipMeetingMode;

  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  maximumParticipants?: number;

  @IsString()
  @MaxLength(80)
  timeZone!: string;

  @IsBoolean()
  @IsOptional()
  applicationsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  matchingEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  stipendsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  publicApplicationsEnabled?: boolean;

  @IsEmail()
  @IsOptional()
  inquiryEmail?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  externalProgramId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  integrationSource?: string;
}
