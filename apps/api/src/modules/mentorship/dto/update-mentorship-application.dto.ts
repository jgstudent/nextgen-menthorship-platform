import { PartialType } from "@nestjs/mapped-types";
import { CreateMentorshipApplicationDto } from "./create-mentorship-application.dto";

export class UpdateMentorshipApplicationDto extends PartialType(CreateMentorshipApplicationDto) {}
