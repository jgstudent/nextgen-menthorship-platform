import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class ReschedulePortalSessionDto {
  @IsDateString()
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
