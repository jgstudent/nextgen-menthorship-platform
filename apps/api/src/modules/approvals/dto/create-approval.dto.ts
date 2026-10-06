import { ApprovalPriority, ApprovalStatus, ApprovalType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateApprovalDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ApprovalType)
  type!: ApprovalType;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @IsEnum(ApprovalPriority)
  @IsOptional()
  priority?: ApprovalPriority;

  @IsString()
  @IsOptional()
  assignedApproverId?: string;

  @IsString()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  programId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  beneficiaryId?: string;

  @IsString()
  @IsOptional()
  workshopId?: string;

  @IsString()
  @IsOptional()
  fileId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
