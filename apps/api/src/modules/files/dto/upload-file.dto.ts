import { IsOptional, IsString } from "class-validator";

export class UploadFileDto {
  @IsString()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  commentId?: string;
}
