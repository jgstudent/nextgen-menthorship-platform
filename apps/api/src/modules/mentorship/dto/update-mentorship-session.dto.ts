import { MentorshipAttendanceStatus, MentorshipSessionStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateMentorshipSessionDto {
  @IsEnum(MentorshipSessionStatus)
  @IsOptional()
  status?: MentorshipSessionStatus;

  @IsEnum(MentorshipAttendanceStatus)
  @IsOptional()
  providerAttendance?: MentorshipAttendanceStatus;

  @IsEnum(MentorshipAttendanceStatus)
  @IsOptional()
  menteeAttendance?: MentorshipAttendanceStatus;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  completedMinutes?: number;

  @IsString()
  @IsOptional()
  @MaxLength(6000)
  notes?: string;
}
