import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateMentorshipGoalDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;
}
