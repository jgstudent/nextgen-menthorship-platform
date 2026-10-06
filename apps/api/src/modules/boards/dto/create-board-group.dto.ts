import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateBoardGroupDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  order?: number;
}
