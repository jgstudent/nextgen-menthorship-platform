import { MentorshipMatchStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class DecideMentorshipMatchDto {
  @IsEnum(MentorshipMatchStatus)
  decision!: MentorshipMatchStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
