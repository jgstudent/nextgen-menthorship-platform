import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePolicyDto } from "./dto/create-policy.dto";
import { CreateResolutionDto } from "./dto/create-resolution.dto";
import { UpdatePolicyDto } from "./dto/update-policy.dto";
import { UpdateResolutionDto } from "./dto/update-resolution.dto";

const GOVERNANCE_WORKSPACE_SLUG = "executive-governance";

const policyInclude = {
  workspace: true,
  createdBy: { select: publicUserSelect },
  approvedBy: { select: publicUserSelect },
  linkedFile: true
} satisfies Prisma.PolicyInclude;

const resolutionInclude = {
  workspace: true,
  meeting: true,
  approval: true,
  document: true,
  createdBy: { select: publicUserSelect }
} satisfies Prisma.BoardResolutionInclude;

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    await this.audit(user, "EXECUTIVE_WORKSPACE_ACCESS", "Workspace", workspace.id);

    const now = new Date();
    const [
      programs,
      pendingApprovals,
      upcomingMeetings,
      policiesUnderReview,
      resolutionsAwaitingApproval,
      restrictedSignaturesPending,
      recentAuditActivity
    ] = await Promise.all([
      this.prisma.program.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
      this.prisma.approval.findMany({ where: { workspaceId: workspace.id, status: { in: ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"] } }, include: { requestedBy: { select: publicUserSelect }, assignedApprover: { select: publicUserSelect }, workspace: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
      this.prisma.meeting.findMany({ where: { workspaceId: workspace.id, status: "SCHEDULED", startTime: { gte: now } }, include: { attendees: { include: { user: { select: publicUserSelect } } }, actionItems: true }, orderBy: { startTime: "asc" }, take: 6 }),
      this.prisma.policy.findMany({ where: { workspaceId: workspace.id, status: "UNDER_REVIEW" }, include: policyInclude, orderBy: { updatedAt: "desc" }, take: 6 }),
      this.prisma.boardResolution.findMany({ where: { workspaceId: workspace.id, status: "UNDER_REVIEW" }, include: resolutionInclude, orderBy: { updatedAt: "desc" }, take: 6 }),
      this.prisma.document.findMany({ where: { workspaceId: workspace.id, status: { in: ["READY_FOR_SIGNATURE", "SENT_FOR_SIGNATURE", "PARTIALLY_SIGNED"] } }, include: { submissions: { include: { signers: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
      this.prisma.organizationAuditLog.findMany({ where: { OR: [{ entityId: workspace.id }, { metadata: { path: ["workspaceId"], equals: workspace.id } }] }, include: { actor: { select: publicUserSelect } }, orderBy: { timestamp: "desc" }, take: 8 })
    ]);

    return {
      workspace,
      programs,
      metrics: {
        governancePrograms: programs.length,
        pendingApprovals: pendingApprovals.length,
        upcomingBoardMeetings: upcomingMeetings.length,
        policiesUnderReview: policiesUnderReview.length,
        resolutionsAwaitingApproval: resolutionsAwaitingApproval.length,
        restrictedSignaturesPending: restrictedSignaturesPending.length
      },
      pendingApprovals,
      upcomingMeetings,
      policiesUnderReview,
      resolutionsAwaitingApproval,
      restrictedSignaturesPending,
      recentAuditActivity
    };
  }

  async meetings(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.meeting.findMany({
      where: { workspaceId: workspace.id },
      include: { createdBy: { select: publicUserSelect }, attendees: { include: { user: { select: publicUserSelect } } }, actionItems: true, documents: true, resolutions: true },
      orderBy: { startTime: "desc" }
    });
  }

  async approvals(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.approval.findMany({
      where: { workspaceId: workspace.id },
      include: { requestedBy: { select: publicUserSelect }, assignedApprover: { select: publicUserSelect }, comments: true, history: true, documents: true, resolutions: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
  }

  async files(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.file.findMany({
      where: this.governanceFileWhere(workspace.id),
      include: { uploadedBy: { select: publicUserSelect }, documents: true, approvals: true, policies: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async documents(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.document.findMany({
      where: { workspaceId: workspace.id },
      include: { createdBy: { select: publicUserSelect }, approval: true, file: true, submissions: { include: { signers: { include: { user: { select: publicUserSelect } } } } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
  }

  async policies(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.policy.findMany({ where: { workspaceId: workspace.id }, include: policyInclude, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  }

  async createPolicy(dto: CreatePolicyDto, user: AuthenticatedUser) {
    this.assertExecutiveManager(user);
    const workspace = await this.governanceWorkspace(user);
    if (dto.linkedFileId) {
      await this.assertGovernanceFile(dto.linkedFileId, workspace.id);
    }
    const policy = await this.prisma.policy.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        version: dto.version,
        workspaceId: workspace.id,
        createdById: user.sub,
        approvedById: dto.approvedById,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        linkedFileId: dto.linkedFileId
      },
      include: policyInclude
    });
    await this.audit(user, "POLICY_CREATED", "Policy", policy.id, { workspaceId: workspace.id, status: policy.status });
    return policy;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto, user: AuthenticatedUser) {
    this.assertExecutiveManager(user);
    const workspace = await this.governanceWorkspace(user);
    await this.assertPolicy(id, workspace.id);
    if (dto.linkedFileId) {
      await this.assertGovernanceFile(dto.linkedFileId, workspace.id);
    }
    const policy = await this.prisma.policy.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        version: dto.version,
        approvedById: dto.approvedById,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        linkedFileId: dto.linkedFileId
      },
      include: policyInclude
    });
    await this.audit(user, "POLICY_UPDATED", "Policy", policy.id, { workspaceId: workspace.id, status: policy.status });
    return policy;
  }

  async resolutions(user: AuthenticatedUser) {
    const workspace = await this.governanceWorkspace(user);
    return this.prisma.boardResolution.findMany({ where: { workspaceId: workspace.id }, include: resolutionInclude, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  }

  async createResolution(dto: CreateResolutionDto, user: AuthenticatedUser) {
    this.assertExecutiveManager(user);
    const workspace = await this.governanceWorkspace(user);
    await this.assertResolutionLinks(dto, workspace.id);
    const resolution = await this.prisma.boardResolution.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        resolutionNumber: dto.resolutionNumber,
        workspaceId: workspace.id,
        meetingId: dto.meetingId,
        approvalId: dto.approvalId,
        documentId: dto.documentId,
        createdById: user.sub,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : undefined
      },
      include: resolutionInclude
    });
    await this.audit(user, "RESOLUTION_CREATED", "BoardResolution", resolution.id, { workspaceId: workspace.id, status: resolution.status });
    return resolution;
  }

  async updateResolution(id: string, dto: UpdateResolutionDto, user: AuthenticatedUser) {
    this.assertExecutiveManager(user);
    const workspace = await this.governanceWorkspace(user);
    await this.assertResolution(id, workspace.id);
    await this.assertResolutionLinks(dto, workspace.id);
    const resolution = await this.prisma.boardResolution.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        resolutionNumber: dto.resolutionNumber,
        meetingId: dto.meetingId,
        approvalId: dto.approvalId,
        documentId: dto.documentId,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : undefined
      },
      include: resolutionInclude
    });
    await this.audit(user, "RESOLUTION_UPDATED", "BoardResolution", resolution.id, { workspaceId: workspace.id, status: resolution.status });
    return resolution;
  }

  private async governanceWorkspace(user: AuthenticatedUser) {
    const workspace = await this.prisma.workspace.findFirst({ where: { slug: GOVERNANCE_WORKSPACE_SLUG } });
    if (!workspace) {
      throw new NotFoundException("Executive Governance workspace has not been seeded yet.");
    }
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.EXECUTIVE) {
      return workspace;
    }
    if (user.role === UserRole.PROJECT_MANAGER) {
      const member = await this.prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.sub } } });
      if (member) {
        return workspace;
      }
    }
    throw new ForbiddenException("Executive Governance is restricted to executive users.");
  }

  private assertExecutiveManager(user: AuthenticatedUser) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.EXECUTIVE) {
      return;
    }
    throw new ForbiddenException("Only executive users can manage governance records.");
  }

  private governanceFileWhere(workspaceId: string): Prisma.FileWhereInput {
    return {
      OR: [
        { task: { board: { workspaceId } } },
        { project: { workspaceId } },
        { comment: { item: { board: { workspaceId } } } },
        { documents: { some: { workspaceId } } },
        { approvals: { some: { workspaceId } } },
        { policies: { some: { workspaceId } } }
      ]
    };
  }

  private async assertGovernanceFile(fileId: string, workspaceId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, ...this.governanceFileWhere(workspaceId) }, select: { id: true } });
    if (!file) {
      throw new ForbiddenException("Linked file must belong to Executive Governance.");
    }
  }

  private async assertPolicy(id: string, workspaceId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!policy) {
      throw new NotFoundException("Policy not found.");
    }
  }

  private async assertResolution(id: string, workspaceId: string) {
    const resolution = await this.prisma.boardResolution.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!resolution) {
      throw new NotFoundException("Resolution not found.");
    }
  }

  private async assertResolutionLinks(dto: Partial<CreateResolutionDto>, workspaceId: string) {
    if (dto.meetingId) {
      const meeting = await this.prisma.meeting.findFirst({ where: { id: dto.meetingId, workspaceId }, select: { id: true } });
      if (!meeting) throw new ForbiddenException("Linked meeting must belong to Executive Governance.");
    }
    if (dto.approvalId) {
      const approval = await this.prisma.approval.findFirst({ where: { id: dto.approvalId, workspaceId }, select: { id: true } });
      if (!approval) throw new ForbiddenException("Linked approval must belong to Executive Governance.");
    }
    if (dto.documentId) {
      const document = await this.prisma.document.findFirst({ where: { id: dto.documentId, workspaceId }, select: { id: true } });
      if (!document) throw new ForbiddenException("Linked document must belong to Executive Governance.");
    }
  }

  private audit(user: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({
      data: {
        actorId: user.sub,
        action,
        entityType,
        entityId,
        metadata
      }
    });
  }
}
