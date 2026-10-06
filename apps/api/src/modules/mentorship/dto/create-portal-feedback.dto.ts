import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreatePortalFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  comments?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  nextSteps?: string;
}
