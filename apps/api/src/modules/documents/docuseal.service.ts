import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentSignerDto } from "./dto/send-document.dto";

type DocusealSubmissionResult = {
  submissionId: string;
  status: "SENT" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "VOIDED" | "ERROR";
  signers: Array<{
    email: string;
    submitterId?: string;
    signingUrl?: string;
    embeddedUrl?: string;
  }>;
  signedDocumentUrl?: string;
  auditTrailUrl?: string;
  raw?: unknown;
};

type DocusealSubmitter = {
  id?: string | number;
  email?: string;
  slug?: string;
  signing_url?: string;
  embed_src?: string;
  embed_url?: string;
};

@Injectable()
export class DocusealService {
  private readonly logger = new Logger(DocusealService.name);

  constructor(private readonly config: ConfigService) {}

  async createSubmission(document: { id: string; title: string; docusealTemplateId?: string | null }, signers: DocumentSignerDto[]): Promise<DocusealSubmissionResult> {
    const baseUrl = this.config.get<string>("DOCUSEAL_BASE_URL");
    const apiKey = this.config.get<string>("DOCUSEAL_API_KEY");

    if (!baseUrl || !apiKey) {
      return {
        submissionId: `local-${document.id}-${Date.now()}`,
        status: "SENT",
        signers: signers.map((signer, index) => ({
          email: signer.email,
          submitterId: `local-submitter-${index + 1}`,
          signingUrl: undefined,
          embeddedUrl: undefined
        })),
        raw: { mode: "placeholder", message: "DocuSeal credentials are not configured." }
      };
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": apiKey
      },
      body: JSON.stringify({
        template_id: document.docusealTemplateId,
        name: document.title,
        submitters: signers.map((signer) => ({
          email: signer.email,
          name: signer.name,
          role: signer.role
        }))
      })
    });

    if (!response.ok) {
      this.logger.warn(`DocuSeal submission failed with ${response.status}`);
      return { submissionId: `error-${document.id}-${Date.now()}`, status: "ERROR", signers: signers.map((signer) => ({ email: signer.email })) };
    }

    const payload = await response.json() as Record<string, unknown>;
    const submitters = Array.isArray(payload.submitters) ? payload.submitters as DocusealSubmitter[] : [];
    const documents = Array.isArray(payload.documents) ? payload.documents as Array<{ url?: string }> : [];
    return {
      submissionId: String(payload.id ?? payload.submission_id ?? `docuseal-${document.id}`),
      status: this.mapSubmissionStatus(typeof payload.status === "string" ? payload.status : undefined),
      signers: signers.map((signer, index) => {
        const submitter = submitters[index] ?? submitters.find((item) => item.email === signer.email) ?? {};
        return {
          email: signer.email,
          submitterId: submitter.id ? String(submitter.id) : undefined,
          signingUrl: submitter.slug ? `${baseUrl.replace(/\/$/, "")}/s/${submitter.slug}` : submitter.signing_url,
          embeddedUrl: submitter.embed_src ?? submitter.embed_url
        };
      }),
      signedDocumentUrl: documents[0]?.url ?? stringValue(payload.signed_document_url),
      auditTrailUrl: stringValue(payload.audit_trail_url),
      raw: payload
    };
  }

  async getSubmissionStatus(docusealSubmissionId: string) {
    const payload = await this.fetchDocuseal<Record<string, unknown>>(`/api/submissions/${docusealSubmissionId}`);
    return payload ? this.mapSubmissionStatus(typeof payload.status === "string" ? payload.status : undefined) : "SENT";
  }

  async getSignerLinks(docusealSubmissionId: string) {
    const payload = await this.fetchDocuseal<Record<string, unknown>>(`/api/submissions/${docusealSubmissionId}`);
    const submitters = payload && Array.isArray(payload.submitters) ? payload.submitters as DocusealSubmitter[] : [];
    return submitters.map((submitter) => ({
      submitterId: submitter.id ? String(submitter.id) : undefined,
      email: submitter.email,
      signingUrl: submitter.signing_url,
      embeddedUrl: submitter.embed_src ?? submitter.embed_url
    }));
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>) {
    const secret = this.config.get<string>("DOCUSEAL_WEBHOOK_SECRET");
    if (!secret) {
      return;
    }
    const provided = firstHeader(headers["x-docuseal-secret"]) ?? firstHeader(headers["x-webhook-secret"]);
    if (provided !== secret) {
      throw new ForbiddenException("Invalid DocuSeal webhook secret.");
    }
  }

  mapSubmissionStatus(status?: string): DocusealSubmissionResult["status"] {
    const value = String(status ?? "").toLowerCase();
    if (value.includes("complete")) return "COMPLETED";
    if (value.includes("decline")) return "DECLINED";
    if (value.includes("void") || value.includes("cancel")) return "VOIDED";
    if (value.includes("progress") || value.includes("open")) return "IN_PROGRESS";
    if (value.includes("error") || value.includes("fail")) return "ERROR";
    return "SENT";
  }

  private async fetchDocuseal<T>(path: string): Promise<T | null> {
    const baseUrl = this.config.get<string>("DOCUSEAL_BASE_URL");
    const apiKey = this.config.get<string>("DOCUSEAL_API_KEY");
    if (!baseUrl || !apiKey) {
      return null;
    }
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { headers: { "X-Auth-Token": apiKey } });
    if (!response.ok) {
      this.logger.warn(`DocuSeal request failed with ${response.status}`);
      return null;
    }
    return response.json() as Promise<T>;
  }
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
