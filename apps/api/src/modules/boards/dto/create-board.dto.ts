import { IsOptional, IsString } from "class-validator";

export class CreateBoardDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  projectId!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
