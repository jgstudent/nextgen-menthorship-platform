import { Body, Controller, Headers, Post } from "@nestjs/common";
import { DocusealWebhookPayload, DocumentsService } from "./documents.service";

@Controller("webhooks/docuseal")
export class DocusealWebhookController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  handle(@Body() payload: DocusealWebhookPayload, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.documents.handleWebhook(payload, headers);
  }
}
