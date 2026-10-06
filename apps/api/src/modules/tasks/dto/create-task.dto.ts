import { Priority, TaskStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from "class-validator";

export class CreateTaskDto {
  @IsString()
  boardId!: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsInt()
  @IsOptional()
  order?: number;
}
