import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DocusealWebhookController } from "./docuseal-webhook.controller";
import { DocusealService } from "./docuseal.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [DocumentsController, DocusealWebhookController],
  providers: [DocumentsService, DocusealService]
})
export class DocumentsModule {}
