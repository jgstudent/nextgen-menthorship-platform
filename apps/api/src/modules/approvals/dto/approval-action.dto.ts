import { IsOptional, IsString } from "class-validator";

export class ApprovalActionDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
