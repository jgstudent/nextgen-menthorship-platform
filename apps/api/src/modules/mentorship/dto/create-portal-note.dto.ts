import { IsString, MinLength } from "class-validator";

export class CreatePortalNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
