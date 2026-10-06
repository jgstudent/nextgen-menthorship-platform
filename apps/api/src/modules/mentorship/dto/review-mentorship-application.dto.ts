import { MentorshipApplicationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewMentorshipApplicationDto {
  @IsEnum(MentorshipApplicationStatus)
  decision!: MentorshipApplicationStatus;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}
