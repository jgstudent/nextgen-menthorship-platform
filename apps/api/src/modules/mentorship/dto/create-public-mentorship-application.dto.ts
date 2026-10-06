import { OmitType } from "@nestjs/mapped-types";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CreateMentorshipApplicationDto } from "./create-mentorship-application.dto";

export class CreatePublicMentorshipApplicationDto extends OmitType(CreateMentorshipApplicationDto, ["source", "applicantUserId", "submit"] as const) {
  @IsString()
  @IsOptional()
  @MaxLength(0)
  website?: string;
}
