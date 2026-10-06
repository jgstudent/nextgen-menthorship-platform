import { IsOptional, IsString, Matches } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
