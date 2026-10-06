import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateMentorshipProgressUpdateDto {
  @IsString()
  @MaxLength(4000)
  summary!: string;

  @IsString()
  @IsOptional()
  @MaxLength(3000)
  challenges?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3000)
  nextSteps?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  progressRating?: number;
}
