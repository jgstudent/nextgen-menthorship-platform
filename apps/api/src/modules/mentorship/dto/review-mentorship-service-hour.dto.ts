import { MentorshipServiceHourStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewMentorshipServiceHourDto {
  @IsEnum(MentorshipServiceHourStatus)
  decision!: MentorshipServiceHourStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reviewNotes?: string;
}
