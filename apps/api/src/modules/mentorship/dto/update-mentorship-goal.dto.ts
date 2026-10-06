import { MentorshipGoalStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateMentorshipGoalDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(MentorshipGoalStatus)
  @IsOptional()
  status?: MentorshipGoalStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;

  @IsDateString()
  @IsOptional()
  targetDate?: string;
}
