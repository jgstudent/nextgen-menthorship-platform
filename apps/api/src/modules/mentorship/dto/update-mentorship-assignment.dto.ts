import { MentorshipAssignmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateMentorshipAssignmentDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MentorshipAssignmentStatus)
  @IsOptional()
  status?: MentorshipAssignmentStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
