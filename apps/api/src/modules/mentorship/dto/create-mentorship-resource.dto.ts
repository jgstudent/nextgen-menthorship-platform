import { MentorshipResourceType } from "@prisma/client";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateMentorshipResourceDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @IsEnum(MentorshipResourceType)
  type!: MentorshipResourceType;

  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
