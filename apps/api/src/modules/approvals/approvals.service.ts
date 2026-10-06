import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalAction, ApprovalStatus, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApprovalCommentDto } from "./dto/create-approval-comment.dto";
import { CreateApprovalDto } from "./dto/create-approval.dto";
import { UpdateApprovalDto } from "./dto/update-approval.dto";

const approvalInclude = {
  requestedBy: { select: publicUserSelect },
  assignedApprover: { select: publicUserSelect },
  workspace: true,
  program: true,
  project: true,
  task: true,
  beneficiary: true,
  workshop: true,
  file: true,
  comments: { include: { author: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } },
  history: { include: { actor: { select: publicUserSelect } }, orderBy: { timestamp: "desc" } }
} as const;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateApprovalDto, user: AuthenticatedUser) {
    await this.validateLinkedAccess(dto, user);
    const approval = await this.prisma.approval.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        requestedBy: { connect: { id: user.sub } },
        assignedApprover: dto.assignedApproverId ? { connect: { id: dto.assignedApproverId } } : undefined,
        workspace: { connect: { id: dto.workspaceId } },
        program: dto.programId ? { connect: { id: dto.programId } } : undefined,
        project: dto.projectId ? { connect: { id: dto.projectId } } : undefined,
        task: dto.taskId ? { connect: { id: dto.taskId } } : undefined,
        beneficiary: dto.beneficiaryId ? { connect: { id: dto.beneficiaryId } } : undefined,
        workshop: dto.workshopId ? { connect: { id: dto.workshopId } } : undefined,
        file: dto.fileId ? { connect: { id: dto.fileId } } : undefined,
        history: { create: { action: "CREATED", actorId: user.sub, newStatus: dto.status ?? "DRAFT" } }
      },
      include: approvalInclude
    });
    await this.audit(user, "APPROVAL_CREATED", approval, undefined, approval.status);
    return approval;
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.approval.findMany({ where: this.access.approvalWhere(user), include: approvalInclude, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    return this.prisma.approval.findUniqueOrThrow({ where: { id }, include: approvalInclude });
  }

  async update(id: string, dto: UpdateApprovalDto, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    await this.validateLinkedAccess(dto, user);
    const approval = await this.prisma.approval.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedApprover: dto.assignedApproverId ? { connect: { id: dto.assignedApproverId } } : undefined,
        workspace: dto.workspaceId ? { connect: { id: dto.workspaceId } } : undefined,
        program: dto.programId ? { connect: { id: dto.programId } } : undefined,
        project: dto.projectId ? { connect: { id: dto.projectId } } : undefined,
        task: dto.taskId ? { connect: { id: dto.taskId } } : undefined,
        beneficiary: dto.beneficiaryId ? { connect: { id: dto.beneficiaryId } } : undefined,
        workshop: dto.workshopId ? { connect: { id: dto.workshopId } } : undefined,
        file: dto.fileId ? { connect: { id: dto.fileId } } : undefined
      },
      include: approvalInclude
    });
    await this.recordHistory(id, "UPDATED", user.sub, undefined, approval.status);
    await this.audit(user, "APPROVAL_UPDATED", approval, undefined, approval.status);
    return approval;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval) {
      throw new NotFoundException("Approval not found.");
    }
    await this.audit(user, "APPROVAL_DELETED", approval, approval.status, undefined);
    return this.prisma.approval.delete({ where: { id } });
  }

  async transition(id: string, action: ApprovalAction, status: ApprovalStatus, user: AuthenticatedUser, notes?: string) {
    await this.access.assertApprovalAccess(id, user);
    const current = await this.prisma.approval.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("Approval not found.");
    }
    this.assertCanTransition(current.requestedById, current.assignedApproverId, action, user);
    const approval = await this.prisma.approval.update({ where: { id }, data: { status }, include: approvalInclude });
    await this.recordHistory(id, action, user.sub, current.status, status, notes);
    await this.audit(user, `APPROVAL_${action}`, approval, current.status, status, notes);
    return approval;
  }

  async createComment(id: string, dto: CreateApprovalCommentDto, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    const comment = await this.prisma.approvalComment.create({ data: { approvalId: id, authorId: user.sub, content: dto.content }, include: { author: { select: publicUserSelect } } });
    await this.recordHistory(id, "COMMENTED", user.sub, undefined, undefined, dto.content);
    const approval = await this.prisma.approval.findUniqueOrThrow({ where: { id } });
    await this.audit(user, "APPROVAL_COMMENTED", approval, approval.status, approval.status);
    return comment;
  }

  async comments(id: string, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    return this.prisma.approvalComment.findMany({ where: { approvalId: id }, include: { author: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } });
  }

  async history(id: string, user: AuthenticatedUser) {
    await this.access.assertApprovalAccess(id, user);
    return this.prisma.approvalHistory.findMany({ where: { approvalId: id }, include: { actor: { select: publicUserSelect } }, orderBy: { timestamp: "desc" } });
  }

  private async validateLinkedAccess(dto: Partial<CreateApprovalDto>, user: AuthenticatedUser) {
    if (dto.workspaceId) {
      await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    }
    if (dto.programId) {
      await this.access.assertProgramAccess(dto.programId, user);
    }
    if (dto.projectId) {
      await this.access.assertProjectAccess(dto.projectId, user);
    }
    if (dto.taskId) {
      await this.access.assertTaskAccess(dto.taskId, user);
    }
    if (dto.beneficiaryId) {
      await this.access.assertBeneficiaryAccess(dto.beneficiaryId, user);
    }
    if (dto.workshopId) {
      await this.access.assertWorkshopAccess(dto.workshopId, user);
    }
  }

  private assertCanTransition(requestedById: string, assignedApproverId: string | null, action: ApprovalAction, user: AuthenticatedUser) {
    if (user.role === UserRole.SPONSOR_VIEWER || user.role === UserRole.BENEFICIARY) {
      throw new ForbiddenException("You cannot perform approval actions.");
    }
    if (action === "SUBMITTED" || action === "CANCELLED") {
      return;
    }
    if (this.access.isOrganizationWide(user) || user.role === UserRole.PROJECT_MANAGER || assignedApproverId === user.sub || requestedById === user.sub) {
      return;
    }
    throw new ForbiddenException("You cannot perform this approval action.");
  }

  private recordHistory(approvalId: string, action: ApprovalAction, actorId: string, previousStatus?: ApprovalStatus, newStatus?: ApprovalStatus, notes?: string) {
    return this.prisma.approvalHistory.create({ data: { approvalId, action, actorId, previousStatus, newStatus, notes } });
  }

  private audit(user: AuthenticatedUser, action: string, approval: { id: string; type: string; workspaceId: string; programId?: string | null; projectId?: string | null; taskId?: string | null; beneficiaryId?: string | null; workshopId?: string | null; fileId?: string | null }, previousStatus?: ApprovalStatus, newStatus?: ApprovalStatus, notes?: string) {
    return this.prisma.organizationAuditLog.create({
      data: {
        actorId: user.sub,
        action,
        entityType: "Approval",
        entityId: approval.id,
        metadata: { approvalType: approval.type, previousStatus, newStatus, notes, linkedEntity: this.linkedEntity(approval) }
      }
    });
  }

  private linkedEntity(approval: { programId?: string | null; projectId?: string | null; taskId?: string | null; beneficiaryId?: string | null; workshopId?: string | null; fileId?: string | null }) {
    return approval.fileId ?? approval.taskId ?? approval.projectId ?? approval.programId ?? approval.beneficiaryId ?? approval.workshopId ?? null;
  }
}
