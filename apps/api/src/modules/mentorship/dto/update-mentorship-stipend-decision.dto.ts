import { MentorshipStipendStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMentorshipStipendDecisionDto {
  @IsEnum(MentorshipStipendStatus)
  status!: MentorshipStipendStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
