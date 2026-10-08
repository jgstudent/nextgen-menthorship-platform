import { IsString, MinLength } from "class-validator";

export class ActivateInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
