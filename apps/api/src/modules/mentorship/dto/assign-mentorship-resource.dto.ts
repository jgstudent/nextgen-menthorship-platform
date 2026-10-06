import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class AssignMentorshipResourceDto {
  @IsString()
  relationshipId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  assigneeParticipantIds!: string[];

  @IsString()
  @IsOptional()
  goalId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
