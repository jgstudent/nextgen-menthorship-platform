import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, DocumentStatus, Prisma, SignerStatus, SubmissionStatus, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { SendDocumentDto } from "./dto/send-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { DocusealService } from "./docuseal.service";

const documentInclude = {
  createdBy: { select: publicUserSelect },
  workspace: true,
  program: true,
  project: true,
  task: true,
  beneficiary: true,
  workshop: true,
  approval: true,
  file: true,
  submissions: {
    include: {
      requestedBy: { select: publicUserSelect },
      signers: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  }
} as const;

export type DocusealWebhookPayload = Record<string, unknown> & {
  id?: string | number;
  submission_id?: string | number;
  submitter_id?: string | number;
  status?: string;
  event_type?: string;
  event?: string;
  email?: string;
  signed_document_url?: string;
  audit_trail_url?: string;
  documents?: Array<{ url?: string }>;
  submission?: { id?: string | number };
  submitter?: { id?: string | number; email?: string };
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly docuseal: DocusealService
  ) {}

  async create(dto: CreateDocumentDto, user: AuthenticatedUser) {
    this.assertCanCreate(user);
    await this.validateLinkedAccess(dto, user);
    const document = await this.prisma.document.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? (dto.approvalId ? "APPROVAL_REQUIRED" : "DRAFT"),
        docusealTemplateId: dto.docusealTemplateId,
        sponsorVisible: dto.sponsorVisible ?? false,
        createdBy: { connect: { id: user.sub } },
        workspace: { connect: { id: dto.workspaceId } },
        program: dto.programId ? { connect: { id: dto.programId } } : undefined,
        project: dto.projectId ? { connect: { id: dto.projectId } } : undefined,
        task: dto.taskId ? { connect: { id: dto.taskId } } : undefined,
        beneficiary: dto.beneficiaryId ? { connect: { id: dto.beneficiaryId } } : undefined,
        workshop: dto.workshopId ? { connect: { id: dto.workshopId } } : undefined,
        approval: dto.approvalId ? { connect: { id: dto.approvalId } } : undefined,
        file: dto.fileId ? { connect: { id: dto.fileId } } : undefined
      },
      include: documentInclude
    });
    await this.audit(user, "DOCUMENT_CREATED", document);
    return document;
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.document.findMany({ where: this.access.documentWhere(user), include: documentInclude, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    const document = await this.prisma.document.findUnique({ where: { id }, include: documentInclude });
    if (!document) {
      throw new NotFoundException("Document not found.");
    }
    await this.audit(user, "DOCUMENT_VIEWED", document);
    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    this.assertCanManage(user);
    await this.validateLinkedAccess(dto, user);
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        docusealTemplateId: dto.docusealTemplateId,
        sponsorVisible: dto.sponsorVisible,
        workspace: dto.workspaceId ? { connect: { id: dto.workspaceId } } : undefined,
        program: dto.programId ? { connect: { id: dto.programId } } : undefined,
        project: dto.projectId ? { connect: { id: dto.projectId } } : undefined,
        task: dto.taskId ? { connect: { id: dto.taskId } } : undefined,
        beneficiary: dto.beneficiaryId ? { connect: { id: dto.beneficiaryId } } : undefined,
        workshop: dto.workshopId ? { connect: { id: dto.workshopId } } : undefined,
        approval: dto.approvalId ? { connect: { id: dto.approvalId } } : undefined,
        file: dto.fileId ? { connect: { id: dto.fileId } } : undefined
      },
      include: documentInclude
    });
    await this.audit(user, "DOCUMENT_UPDATED", document);
    return document;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    this.assertCanManage(user);
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException("Document not found.");
    }
    await this.audit(user, "DOCUMENT_DELETED", document);
    return this.prisma.document.delete({ where: { id } });
  }

  async sendForSignature(id: string, dto: SendDocumentDto, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    this.assertCanSend(user);
    const document = await this.prisma.document.findUnique({ where: { id }, include: { approval: true } });
    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    if (document.approvalId && document.approval?.status !== ApprovalStatus.APPROVED) {
      await this.audit(user, "DOCUMENT_SEND_BLOCKED_APPROVAL_PENDING", document, { approvalStatus: document.approval?.status });
      throw new ForbiddenException("This document cannot be sent for signature until the linked approval is approved.");
    }

    const external = await this.docuseal.createSubmission(document, dto.signers);
    const submission = await this.prisma.documentSubmission.create({
      data: {
        documentId: id,
        requestedById: user.sub,
        status: external.status as SubmissionStatus,
        docusealSubmissionId: external.submissionId,
        docusealTemplateId: document.docusealTemplateId,
        sentAt: new Date(),
        signedDocumentUrl: external.signedDocumentUrl,
        auditTrailUrl: external.auditTrailUrl,
        metadata: external.raw as Prisma.InputJsonValue,
        signers: {
          create: dto.signers.map((signer) => {
            const externalSigner = external.signers.find((item) => item.email === signer.email);
            return {
              userId: signer.userId,
              email: signer.email,
              name: signer.name,
              role: signer.role,
              status: "SENT" as SignerStatus,
              docusealSubmitterId: externalSigner?.submitterId,
              signingUrl: externalSigner?.signingUrl,
              embeddedUrl: externalSigner?.embeddedUrl
            };
          })
        }
      }
    });
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: external.status === "COMPLETED" ? "COMPLETED" : "SENT_FOR_SIGNATURE", signedDocumentUrl: external.signedDocumentUrl, auditTrailUrl: external.auditTrailUrl },
      include: documentInclude
    });
    await this.audit(user, "DOCUMENT_SENT_FOR_SIGNATURE", updated, { submissionId: submission.id, docusealSubmissionId: external.submissionId });
    return updated;
  }

  async submissions(id: string, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    return this.prisma.documentSubmission.findMany({
      where: { documentId: id },
      include: { requestedBy: { select: publicUserSelect }, signers: { include: { user: { select: publicUserSelect } } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async signers(id: string, user: AuthenticatedUser) {
    await this.access.assertDocumentAccess(id, user);
    return this.prisma.submissionSigner.findMany({
      where: { submission: { documentId: id } },
      include: { user: { select: publicUserSelect }, submission: true },
      orderBy: { createdAt: "asc" }
    });
  }

  async handleWebhook(payload: DocusealWebhookPayload, headers: Record<string, string | string[] | undefined>) {
    this.docuseal.verifyWebhook(headers);
    const submissionId = String(payload.submission_id ?? payload.submission?.id ?? payload.id ?? "");
    const submitterId = payload.submitter_id ?? payload.submitter?.id;
    const submitterEmail = payload.submitter?.email ?? payload.email;
    const status = this.docuseal.mapSubmissionStatus(payload.status ?? payload.event_type ?? payload.event);
    const submission = submissionId
      ? await this.prisma.documentSubmission.findFirst({ where: { docusealSubmissionId: submissionId }, include: { document: true } })
      : null;

    await this.prisma.organizationAuditLog.create({
      data: {
        action: "DOCUMENT_WEBHOOK_RECEIVED",
        entityType: "DocuSealWebhook",
        entityId: submission?.documentId ?? submissionId || "unknown",
        metadata: payload as Prisma.InputJsonValue
      }
    });

    if (!submission) {
      return { received: true, matched: false };
    }

    await this.prisma.documentSubmission.update({
      where: { id: submission.id },
      data: {
        status: status as SubmissionStatus,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        signedDocumentUrl: payload.signed_document_url ?? payload.documents?.[0]?.url,
        auditTrailUrl: payload.audit_trail_url
      }
    });

    if (submitterId || submitterEmail) {
      const signerStatus = status === "COMPLETED" ? "SIGNED" : status === "DECLINED" ? "DECLINED" : "VIEWED";
      const signerScope: Prisma.SubmissionSignerWhereInput[] = [];
      if (submitterId) signerScope.push({ docusealSubmitterId: String(submitterId) });
      if (submitterEmail) signerScope.push({ email: String(submitterEmail) });
      await this.prisma.submissionSigner.updateMany({
        where: {
          submissionId: submission.id,
          OR: signerScope
        },
        data: { status: signerStatus as SignerStatus, signedAt: signerStatus === "SIGNED" ? new Date() : undefined }
      });
      if (signerStatus === "SIGNED") {
        await this.prisma.organizationAuditLog.create({
          data: {
            action: "DOCUMENT_SIGNED",
            entityType: "Document",
            entityId: submission.documentId,
            metadata: { docusealSubmissionId: submissionId, submitterId, submitterEmail }
          }
        });
      }
    }

    if (status === "COMPLETED" || status === "DECLINED" || status === "VOIDED") {
      const documentStatus: DocumentStatus = status === "COMPLETED" ? "COMPLETED" : status === "DECLINED" ? "DECLINED" : "VOIDED";
      const document = await this.prisma.document.update({
        where: { id: submission.documentId },
        data: {
          status: documentStatus,
          signedDocumentUrl: payload.signed_document_url ?? payload.documents?.[0]?.url,
          auditTrailUrl: payload.audit_trail_url
        }
      });
      await this.prisma.organizationAuditLog.create({
        data: {
          action: documentStatus === "COMPLETED" ? "DOCUMENT_COMPLETED" : "DOCUMENT_VOIDED",
          entityType: "Document",
          entityId: document.id,
          metadata: { status: documentStatus, docusealSubmissionId: submissionId }
        }
      });
    }

    return { received: true, matched: true };
  }

  private async validateLinkedAccess(dto: Partial<CreateDocumentDto>, user: AuthenticatedUser) {
    if (dto.workspaceId) await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    if (dto.programId) await this.access.assertProgramAccess(dto.programId, user);
    if (dto.projectId) await this.access.assertProjectAccess(dto.projectId, user);
    if (dto.taskId) await this.access.assertTaskAccess(dto.taskId, user);
    if (dto.beneficiaryId) await this.access.assertBeneficiaryAccess(dto.beneficiaryId, user);
    if (dto.workshopId) await this.access.assertWorkshopAccess(dto.workshopId, user);
    if (dto.approvalId) await this.access.assertApprovalAccess(dto.approvalId, user);
    if (dto.fileId) await this.assertFileAccess(dto.fileId, user);
  }

  private async assertFileAccess(fileId: string, user: AuthenticatedUser) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [
          ...(this.access.isOrganizationWide(user) ? [{}] : []),
          { uploadedById: user.sub },
          { task: this.access.taskWhere(user) },
          { project: this.access.projectWhere(user) }
        ]
      },
      select: { id: true }
    });
    if (!file) {
      throw new ForbiddenException("You do not have access to this file.");
    }
  }

  private assertCanCreate(user: AuthenticatedUser) {
    if ([UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return;
    }
    throw new ForbiddenException("You cannot create documents.");
  }

  private assertCanManage(user: AuthenticatedUser) {
    if ([UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return;
    }
    throw new ForbiddenException("You cannot manage documents.");
  }

  private assertCanSend(user: AuthenticatedUser) {
    if ([UserRole.SUPER_ADMIN, UserRole.EXECUTIVE, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return;
    }
    throw new ForbiddenException("You cannot send documents for signature.");
  }

  private audit(user: AuthenticatedUser, action: string, document: { id: string; status: string; workspaceId?: string | null; programId?: string | null; projectId?: string | null; taskId?: string | null; beneficiaryId?: string | null; workshopId?: string | null; approvalId?: string | null; fileId?: string | null }, metadata?: Prisma.InputJsonValue) {
    const extra = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Prisma.JsonObject : { detail: metadata ?? null };
    return this.prisma.organizationAuditLog.create({
      data: {
        actorId: user.sub,
        action,
        entityType: "Document",
        entityId: document.id,
        metadata: { status: document.status, linkedEntity: this.linkedEntity(document), ...extra }
      }
    });
  }

  private linkedEntity(document: { programId?: string | null; projectId?: string | null; taskId?: string | null; beneficiaryId?: string | null; workshopId?: string | null; approvalId?: string | null; fileId?: string | null }) {
    return document.fileId ?? document.approvalId ?? document.taskId ?? document.projectId ?? document.programId ?? document.beneficiaryId ?? document.workshopId ?? null;
  }
}
