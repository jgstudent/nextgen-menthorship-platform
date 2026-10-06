import { IsString, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;
}
