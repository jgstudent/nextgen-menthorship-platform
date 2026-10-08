import { MentorshipAssignmentStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdatePortalAssignmentDto {
  @IsEnum(MentorshipAssignmentStatus)
  status!: MentorshipAssignmentStatus;
}
