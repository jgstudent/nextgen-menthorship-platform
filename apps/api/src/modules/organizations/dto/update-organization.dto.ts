import { IsArray, IsEmail, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateOrganizationDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @IsOptional()
  missionSummary?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledAddOns?: string[];
}
