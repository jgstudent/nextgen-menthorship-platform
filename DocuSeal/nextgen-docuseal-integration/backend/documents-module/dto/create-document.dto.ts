import { DocumentStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

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
  approvalId?: string;

  @IsString()
  @IsOptional()
  fileId?: string;

  @IsString()
  @IsOptional()
  docusealTemplateId?: string;

  @IsBoolean()
  @IsOptional()
  sponsorVisible?: boolean;
}
