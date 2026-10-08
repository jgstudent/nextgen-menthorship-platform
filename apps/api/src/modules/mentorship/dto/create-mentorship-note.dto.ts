import { MentorshipNoteVisibility } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateMentorshipNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(MentorshipNoteVisibility)
  @IsOptional()
  visibility?: MentorshipNoteVisibility;
}
