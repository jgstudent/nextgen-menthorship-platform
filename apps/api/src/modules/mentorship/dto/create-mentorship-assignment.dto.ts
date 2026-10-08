import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateMentorshipAssignmentDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  assigneeParticipantId!: string;

  @IsString()
  @IsOptional()
  goalId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
