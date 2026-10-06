import { IsOptional, IsString } from "class-validator";

export class ConvertActionItemDto {
  @IsString()
  @IsOptional()
  boardId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;
}
