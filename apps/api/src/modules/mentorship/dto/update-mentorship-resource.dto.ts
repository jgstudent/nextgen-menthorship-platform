import { PartialType } from "@nestjs/mapped-types";
import { CreateMentorshipResourceDto } from "./create-mentorship-resource.dto";

export class UpdateMentorshipResourceDto extends PartialType(CreateMentorshipResourceDto) {}
