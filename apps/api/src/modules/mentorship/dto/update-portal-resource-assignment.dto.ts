import { MentorshipResourceAssignmentStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdatePortalResourceAssignmentDto {
  @IsEnum(MentorshipResourceAssignmentStatus)
  status!: MentorshipResourceAssignmentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  completionNotes?: string;
}
