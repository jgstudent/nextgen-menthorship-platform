import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";
import { MeetingStatus } from "@prisma/client";
import { MeetingAttendeeDto } from "./meeting-attendee.dto";

export class CreateMeetingDto {
  @IsString()
  organizationId!: string;

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUrl({ require_protocol: true })
  @IsOptional()
  videoUrl?: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsEnum(MeetingStatus)
  @IsOptional()
  status?: MeetingStatus;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingAttendeeDto)
  @IsOptional()
  attendees?: MeetingAttendeeDto[];
}
