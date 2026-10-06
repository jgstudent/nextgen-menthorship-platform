import { MentorshipMeetingMode } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdatePortalAvailabilityDto {
  @IsString()
  participantId!: string;

  @IsObject()
  availability!: Record<string, unknown>;

  @IsEnum(MentorshipMeetingMode)
  @IsOptional()
  meetingMode?: MentorshipMeetingMode;

  @IsInt()
  @Min(0)
  @Max(168)
  @IsOptional()
  hoursPerWeek?: number;

  @IsBoolean()
  @IsOptional()
  availableForMatch?: boolean;
}
