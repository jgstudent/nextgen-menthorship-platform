import { IsDateString, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from "class-validator";

export class CreatePortalServiceHourDto {
  @IsString()
  participantId!: string;

  @IsString()
  relationshipId!: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  serviceDate!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  minutes!: number;

  @IsString()
  @MaxLength(160)
  activity!: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @IsOptional()
  evidenceUrl?: string;
}
