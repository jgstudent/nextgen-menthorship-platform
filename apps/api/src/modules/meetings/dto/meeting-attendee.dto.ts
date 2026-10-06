import { MeetingAttendeeRole, MeetingResponseStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class MeetingAttendeeDto {
  @IsString()
  userId!: string;

  @IsEnum(MeetingAttendeeRole)
  @IsOptional()
  role?: MeetingAttendeeRole;

  @IsEnum(MeetingResponseStatus)
  @IsOptional()
  responseStatus?: MeetingResponseStatus;
}
