import { MentorshipMeetingMode } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateMentorshipSessionDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsDateString()
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;

  @IsEnum(MentorshipMeetingMode)
  meetingMode!: MentorshipMeetingMode;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsUrl({ require_protocol: true })
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  agenda?: string;
}
