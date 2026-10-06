import { PartialType } from "@nestjs/mapped-types";
import { CreateMentorshipProgramDto } from "./create-mentorship-program.dto";

export class UpdateMentorshipProgramDto extends PartialType(CreateMentorshipProgramDto) {}
