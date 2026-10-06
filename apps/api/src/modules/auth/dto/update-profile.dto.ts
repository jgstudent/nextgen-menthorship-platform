import { IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
