import { IsString } from "class-validator";

export class DeleteMentorshipProgramDto {
  @IsString()
  confirmation!: string;
}
