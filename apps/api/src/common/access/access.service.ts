import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProgramStatus, ProjectStatus, UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../types/authenticated-user";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly executiveGovernanceSlug = "executive-governance";

  isOrganizationWide(user: AuthenticatedUser) {
    return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.EXECUTIVE;
  }

  workspaceWhere(user: AuthenticatedUser): Prisma.WorkspaceWhereInput {
    if (this.isOrganizationWide(user)) {
      return {};
    }
    if (user.role === UserRole.PROJECT_MANAGER) {
      return { members: { some: { userId: user.sub } } };
    }
    return { slug: { not: this.executiveGovernanceSlug }, members: { some: { userId: user.sub } } };
  }

  projectWhere(user: AuthenticatedUser): Prisma.ProjectWhereInput {
    const activeProject: Prisma.ProjectWhereInput = { status: { not: ProjectStatus.ARCHIVED } };
    if (this.isOrganizationWide(user)) {
      return activeProject;
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { ...activeProject, program: { visibility: { in: ["SPONSOR_VISIBLE", "PUBLIC_SUMMARY"] } } };
    }
    if (user.role === UserRole.BENEFICIARY) {
      return { ...activeProject, beneficiaryAssignments: { some: { beneficiary: { userId: user.sub } } } };
    }
    const scopedProjectWhere = {
      OR: [
        { workspace: this.workspaceWhere(user) },
        { userAssignments: { some: { userId: user.sub } } },
        { program: { userAssignments: { some: { userId: user.sub } } } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return { AND: [activeProject, scopedProjectWhere] };
    }
    return { AND: [activeProject, { workspace: { slug: { not: this.executiveGovernanceSlug } } }, scopedProjectWhere] };
  }

  boardWhere(user: AuthenticatedUser, projectId?: string): Prisma.BoardWhereInput {
    const base: Prisma.BoardWhereInput = projectId ? { projectId, project: { status: { not: ProjectStatus.ARCHIVED } } } : { project: { status: { not: ProjectStatus.ARCHIVED } } };
    return this.isOrganizationWide(user) ? base : { ...base, workspace: this.workspaceWhere(user) };
  }

  taskWhere(user: AuthenticatedUser, boardId?: string): Prisma.ItemWhereInput {
    const base: Prisma.ItemWhereInput = boardId
      ? { boardId, archivedAt: null, board: { project: { status: { not: ProjectStatus.ARCHIVED } } } }
      : { archivedAt: null, board: { project: { status: { not: ProjectStatus.ARCHIVED } } } };
    if (this.isOrganizationWide(user)) {
      return base;
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { ...base, id: "__no_sponsor_task_access__" };
    }
    if (user.role === UserRole.VOLUNTEER || user.role === UserRole.BENEFICIARY) {
      return { ...base, assigneeId: user.sub };
    }
    const scopedTaskWhere = {
      ...base,
      OR: [
        { board: { workspace: this.workspaceWhere(user) } },
        { board: { project: { userAssignments: { some: { userId: user.sub } } } } },
        { board: { project: { program: { userAssignments: { some: { userId: user.sub } } } } } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return scopedTaskWhere;
    }
    return { AND: [{ board: { workspace: { slug: { not: this.executiveGovernanceSlug } } } }, scopedTaskWhere] };
  }

  programWhere(user: AuthenticatedUser): Prisma.ProgramWhereInput {
    const activeProgram: Prisma.ProgramWhereInput = { status: { not: ProgramStatus.ARCHIVED } };
    if (this.isOrganizationWide(user)) {
      return activeProgram;
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { ...activeProgram, visibility: { in: ["SPONSOR_VISIBLE", "PUBLIC_SUMMARY"] } };
    }
    if (user.role === UserRole.BENEFICIARY) {
      return { ...activeProgram, enrollments: { some: { beneficiary: { userId: user.sub } } } };
    }
    const scopedProgramWhere = {
      OR: [
        { workspace: this.workspaceWhere(user) },
        { userAssignments: { some: { userId: user.sub } } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return { AND: [activeProgram, scopedProgramWhere] };
    }
    return { AND: [activeProgram, { workspace: { slug: { not: this.executiveGovernanceSlug } } }, scopedProgramWhere] };
  }

  beneficiaryWhere(user: AuthenticatedUser): Prisma.BeneficiaryWhereInput {
    if (this.isOrganizationWide(user) || user.role === UserRole.PROJECT_MANAGER) {
      return {};
    }
    if (user.role === UserRole.BENEFICIARY) {
      return { userId: user.sub };
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { id: "__no_sponsor_beneficiary_access__" };
    }
    return {
      OR: [
        { assignedMentorId: user.sub },
        { enrollments: { some: { assignedMentorId: user.sub } } },
        { workshopEnrollments: { some: { workshop: { instructorId: user.sub } } } }
      ]
    };
  }

  workshopWhere(user: AuthenticatedUser): Prisma.WorkshopWhereInput {
    const activeWorkshop: Prisma.WorkshopWhereInput = { archivedAt: null, program: { status: { not: ProgramStatus.ARCHIVED } } };
    if (this.isOrganizationWide(user)) {
      return activeWorkshop;
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { archivedAt: null, visibility: { in: ["SPONSOR_VISIBLE", "PUBLIC_SUMMARY"] }, program: { status: { not: ProgramStatus.ARCHIVED }, visibility: { in: ["SPONSOR_VISIBLE", "PUBLIC_SUMMARY"] } } };
    }
    if (user.role === UserRole.BENEFICIARY) {
      return {
        OR: [
          { archivedAt: null, visibility: "BENEFICIARY_VISIBLE", program: { status: { not: ProgramStatus.ARCHIVED }, enrollments: { some: { beneficiary: { userId: user.sub } } } } },
          { archivedAt: null, program: { status: { not: ProgramStatus.ARCHIVED } }, enrollments: { some: { beneficiary: { userId: user.sub } } } }
        ]
      };
    }
    const scopedWorkshopWhere = {
      OR: [
        { program: { workspace: this.workspaceWhere(user) } },
        { program: { userAssignments: { some: { userId: user.sub } } } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return { AND: [activeWorkshop, scopedWorkshopWhere] };
    }
    return { AND: [activeWorkshop, { program: { workspace: { slug: { not: this.executiveGovernanceSlug } } } }, scopedWorkshopWhere] };
  }

  approvalWhere(user: AuthenticatedUser): Prisma.ApprovalWhereInput {
    if (this.isOrganizationWide(user)) {
      return {};
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { id: "__no_sponsor_approval_access__" };
    }
    const nonGovernanceWorkspace = { workspace: { slug: { not: this.executiveGovernanceSlug } } };
    if (user.role === UserRole.BENEFICIARY) {
      return {
        AND: [
          nonGovernanceWorkspace,
          {
            OR: [
              { requestedById: user.sub },
              { assignedApproverId: user.sub },
              { beneficiary: { userId: user.sub } },
              { workshop: { enrollments: { some: { beneficiary: { userId: user.sub } } } } },
              { task: { assigneeId: user.sub } }
            ]
          }
        ]
      };
    }
    if (user.role === UserRole.VOLUNTEER) {
      return {
        AND: [
          nonGovernanceWorkspace,
          {
            OR: [
              { requestedById: user.sub },
              { assignedApproverId: user.sub },
              { task: { assigneeId: user.sub } },
              { workshop: { instructorId: user.sub } }
            ]
          }
        ]
      };
    }
    const scopedApprovalWhere = {
      OR: [
        { requestedById: user.sub },
        { assignedApproverId: user.sub },
        { workspace: { members: { some: { userId: user.sub } } } },
        { program: { userAssignments: { some: { userId: user.sub } } } },
        { project: { userAssignments: { some: { userId: user.sub } } } },
        { task: { assigneeId: user.sub } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return scopedApprovalWhere;
    }
    return { AND: [nonGovernanceWorkspace, scopedApprovalWhere] };
  }

  documentWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    if (this.isOrganizationWide(user)) {
      return {};
    }
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return {
        status: "COMPLETED",
        sponsorVisible: true,
        workspace: { slug: { not: this.executiveGovernanceSlug } }
      };
    }
    const nonGovernanceWorkspace = { workspace: { slug: { not: this.executiveGovernanceSlug } } };
    if (user.role === UserRole.BENEFICIARY) {
      return {
        AND: [
          nonGovernanceWorkspace,
          {
            OR: [
              { beneficiary: { userId: user.sub } },
              { workshop: { enrollments: { some: { beneficiary: { userId: user.sub } } } } },
              { task: { assigneeId: user.sub } },
              { submissions: { some: { signers: { some: { userId: user.sub } } } } }
            ]
          }
        ]
      };
    }
    if (user.role === UserRole.VOLUNTEER) {
      return {
        AND: [
          nonGovernanceWorkspace,
          {
            OR: [
              { createdById: user.sub },
              { task: { assigneeId: user.sub } },
              { workshop: { instructorId: user.sub } },
              { submissions: { some: { signers: { some: { userId: user.sub } } } } }
            ]
          }
        ]
      };
    }
    const scopedDocumentWhere = {
      OR: [
        { createdById: user.sub },
        { workspace: { members: { some: { userId: user.sub } } } },
        { program: { userAssignments: { some: { userId: user.sub } } } },
        { project: { userAssignments: { some: { userId: user.sub } } } },
        { task: { assigneeId: user.sub } },
        { submissions: { some: { signers: { some: { userId: user.sub } } } } }
      ]
    };
    if (user.role === UserRole.PROJECT_MANAGER) {
      return scopedDocumentWhere;
    }
    return { AND: [nonGovernanceWorkspace, scopedDocumentWhere] };
  }

  async assertWorkspaceAccess(workspaceId: string, user: AuthenticatedUser) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, ...this.workspaceWhere(user) }, select: { id: true } });
    if (!workspace) {
      throw new ForbiddenException("You do not have access to this workspace.");
    }
  }

  async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, ...this.projectWhere(user) }, select: { id: true } });
    if (!project) {
      throw new ForbiddenException("You do not have access to this project.");
    }
  }

  async assertBoardAccess(boardId: string, user: AuthenticatedUser) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, ...this.boardWhere(user) }, select: { id: true } });
    if (!board) {
      throw new ForbiddenException("You do not have access to this board.");
    }
  }

  async assertTaskAccess(taskId: string, user: AuthenticatedUser) {
    const task = await this.prisma.item.findFirst({ where: { id: taskId, ...this.taskWhere(user) }, select: { id: true } });
    if (!task) {
      throw new NotFoundException("Task not found.");
    }
  }

  async assertProgramAccess(programId: string, user: AuthenticatedUser) {
    const program = await this.prisma.program.findFirst({ where: { id: programId, ...this.programWhere(user) }, select: { id: true } });
    if (!program) {
      throw new ForbiddenException("You do not have access to this program.");
    }
  }

  async assertBeneficiaryAccess(beneficiaryId: string, user: AuthenticatedUser) {
    const beneficiary = await this.prisma.beneficiary.findFirst({ where: { id: beneficiaryId, ...this.beneficiaryWhere(user) }, select: { id: true } });
    if (!beneficiary) {
      throw new ForbiddenException("You do not have access to this beneficiary.");
    }
  }

  async assertWorkshopAccess(workshopId: string, user: AuthenticatedUser) {
    const workshop = await this.prisma.workshop.findFirst({ where: { id: workshopId, ...this.workshopWhere(user) }, select: { id: true } });
    if (!workshop) {
      throw new ForbiddenException("You do not have access to this workshop.");
    }
  }

  async assertApprovalAccess(approvalId: string, user: AuthenticatedUser) {
    const approval = await this.prisma.approval.findFirst({ where: { id: approvalId, ...this.approvalWhere(user) }, select: { id: true } });
    if (!approval) {
      throw new ForbiddenException("You do not have access to this approval.");
    }
  }

  async assertDocumentAccess(documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({ where: { id: documentId, ...this.documentWhere(user) }, select: { id: true } });
    if (!document) {
      throw new ForbiddenException("You do not have access to this document.");
    }
  }
}
