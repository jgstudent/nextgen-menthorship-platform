import { IsString } from "class-validator";

export class CreateApprovalCommentDto {
  @IsString()
  content!: string;
}
