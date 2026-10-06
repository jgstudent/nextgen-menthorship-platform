import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { MentorshipController } from "./mentorship.controller";
import { MentorshipService } from "./mentorship.service";
import { PublicMentorshipController } from "./public-mentorship.controller";
import { MentorshipPortalController } from "./mentorship-portal.controller";

@Module({ imports: [PrismaModule, ConfigModule], controllers: [MentorshipController, MentorshipPortalController, PublicMentorshipController], providers: [MentorshipService] })
export class MentorshipModule {}
