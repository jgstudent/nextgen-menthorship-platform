import { MentorshipParticipantStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class UpdateMentorshipParticipantDto {
  @IsBoolean()
  @IsOptional()
  availableForMatch?: boolean;

  @IsEnum(MentorshipParticipantStatus)
  @IsOptional()
  status?: MentorshipParticipantStatus;
}
