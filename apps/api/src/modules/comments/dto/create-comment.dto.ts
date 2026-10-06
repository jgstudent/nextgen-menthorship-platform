import { IsOptional, IsString } from "class-validator";

export class CreateCommentDto {
  @IsString()
  itemId!: string;

  @IsString()
  body!: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
