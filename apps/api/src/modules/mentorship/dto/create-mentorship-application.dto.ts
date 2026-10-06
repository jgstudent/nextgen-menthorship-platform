import { MentorshipApplicationSource, MentorshipMeetingMode, MentorshipParticipantRole } from "@prisma/client";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateMentorshipApplicationDto {
  @IsString()
  cohortId!: string;

  @IsEnum(MentorshipParticipantRole)
  role!: MentorshipParticipantRole;

  @IsEnum(MentorshipApplicationSource)
  @IsOptional()
  source?: MentorshipApplicationSource;

  @IsString()
  @IsOptional()
  applicantUserId?: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @MaxLength(80)
  timeZone!: string;

  @IsArray()
  @IsString({ each: true })
  languages!: string[];

  @IsString()
  @IsOptional()
  locationRegion?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  degreeProgram?: string;

  @IsString()
  @IsOptional()
  major?: string;

  @IsString()
  @IsOptional()
  minor?: string;

  @IsString()
  @IsOptional()
  academicLevel?: string;

  @IsInt()
  @Min(1900)
  @Max(2200)
  @IsOptional()
  graduationYear?: number;

  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  gpa?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disciplines?: string[];

  @IsObject()
  @IsOptional()
  expertise?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mentoringCapabilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportNeeds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  careerInterests?: string[];

  @IsObject()
  @IsOptional()
  availability?: Record<string, unknown>;

  @IsEnum(MentorshipMeetingMode)
  @IsOptional()
  meetingMode?: MentorshipMeetingMode;

  @IsInt()
  @Min(1)
  @Max(40)
  @IsOptional()
  hoursPerWeek?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maximumMentees?: number;

  @IsString()
  @IsOptional()
  primaryObjective?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  goals?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  currentChallenge?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  motivation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  experience?: string;

  @IsObject()
  @IsOptional()
  consentItems?: Record<string, boolean>;

  @IsBoolean()
  @IsOptional()
  submit?: boolean;
}
