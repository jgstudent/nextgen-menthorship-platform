import { MeetingActionItemStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateActionItemDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(MeetingActionItemStatus)
  @IsOptional()
  status?: MeetingActionItemStatus;
}
