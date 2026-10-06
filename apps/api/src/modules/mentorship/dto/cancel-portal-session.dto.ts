import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelPortalSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
