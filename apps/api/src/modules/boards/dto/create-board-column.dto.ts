import { BoardColumnType } from "@prisma/client";
import { IsEnum, IsInt, IsObject, IsOptional, IsString } from "class-validator";

export class CreateBoardColumnDto {
  @IsString()
  name!: string;

  @IsEnum(BoardColumnType)
  type!: BoardColumnType;

  @IsObject()
  @IsOptional()
  settingsJson?: Record<string, unknown>;

  @IsInt()
  @IsOptional()
  order?: number;
}
