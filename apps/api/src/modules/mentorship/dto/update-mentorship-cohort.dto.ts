import { PartialType } from "@nestjs/mapped-types";
import { CreateMentorshipCohortDto } from "./create-mentorship-cohort.dto";

export class UpdateMentorshipCohortDto extends PartialType(CreateMentorshipCohortDto) {}
