import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreatePublicMentorshipApplicationDto } from "./dto/create-public-mentorship-application.dto";
import { MentorshipService } from "./mentorship.service";

@Controller("public/mentorship")
export class PublicMentorshipController {
  constructor(private readonly mentorship: MentorshipService) {}

  @Get(":token")
  findPublicProgram(@Param("token") token: string, @Query("preview") preview?: string) {
    return this.mentorship.findPublicProgram(token, preview === "true");
  }

  @Post(":token/applications")
  createPublicApplication(@Param("token") token: string, @Body() dto: CreatePublicMentorshipApplicationDto) {
    return this.mentorship.createPublicApplication(token, dto);
  }
}
