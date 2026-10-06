import { Injectable } from "@nestjs/common";
import { Prisma, ProjectStatus, TaskStatus, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async getOverview(user: AuthenticatedUser) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const meetingWhere: Prisma.MeetingWhereInput = this.meetingWhere(user);

    const [assignedTasks, overdueTasks, dueSoonTasks, activeProjects, recentUpdates, workspaceCount, accessibleTaskCount, upcomingMeetings, todaysMeetings, pendingActionItems, recentlyCompletedMeetings, activeUserCount, suspendedUserCount, beneficiaryCount, activeProgramCount, auditActivity, roleDistribution, pendingApprovals, overdueApprovals, recentApprovalDecisions] = await Promise.all([
      this.prisma.item.findMany({
        where: { assigneeId: user.sub, archivedAt: null, board: { project: { status: { not: ProjectStatus.ARCHIVED } } }, status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] } },
        include: { board: { include: { project: true } } },
        orderBy: { dueDate: "asc" },
        take: 8
      }),
      this.prisma.item.findMany({
        where: {
          assigneeId: user.sub,
          archivedAt: null,
          board: { project: { status: { not: ProjectStatus.ARCHIVED } } },
          dueDate: { lt: today },
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] }
        },
        include: { board: { include: { project: true } } },
        orderBy: { dueDate: "asc" },
        take: 8
      }),
      this.prisma.item.findMany({
        where: {
          ...this.access.taskWhere(user),
          dueDate: { gte: today, lte: nextWeek },
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] }
        },
        include: { board: { include: { project: true } } },
        orderBy: { dueDate: "asc" },
        take: 8
      }),
      this.prisma.project.findMany({
        where: { status: "ACTIVE", ...this.access.projectWhere(user) },
        include: { workspace: true, boards: { include: { _count: { select: { items: true } } } } },
        take: 6,
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.activityLog.findMany({
        where: this.access.isOrganizationWide(user) ? {} : { workspace: { members: { some: { userId: user.sub } } } },
        include: { actor: { select: publicUserSelect }, project: true, workspace: true },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      this.prisma.workspace.count({ where: this.access.workspaceWhere(user) }),
      this.prisma.item.count({ where: this.access.taskWhere(user) }),
      this.prisma.meeting.findMany({
        where: { ...meetingWhere, status: "SCHEDULED", startTime: { gte: today } },
        include: { workspace: true, project: true },
        orderBy: { startTime: "asc" },
        take: 6
      }),
      this.prisma.meeting.findMany({
        where: { ...meetingWhere, startTime: { gte: startOfDay(today), lte: endOfDay(today) } },
        include: { workspace: true, project: true },
        orderBy: { startTime: "asc" },
        take: 6
      }),
      this.prisma.meetingActionItem.findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          OR: [
            { assignedToId: user.sub },
            { meeting: meetingWhere }
          ]
        },
        include: { assignedTo: { select: publicUserSelect }, meeting: true },
        orderBy: { dueDate: "asc" },
        take: 8
      }),
      this.prisma.meeting.findMany({
        where: { ...meetingWhere, status: "COMPLETED" },
        include: { workspace: true, project: true },
        orderBy: { updatedAt: "desc" },
        take: 4
      }),
      this.access.isOrganizationWide(user) ? this.prisma.user.count({ where: { status: "ACTIVE", isActive: true } }) : Promise.resolve(0),
      this.access.isOrganizationWide(user) ? this.prisma.user.count({ where: { status: { in: ["SUSPENDED", "DISABLED"] } } }) : Promise.resolve(0),
      this.access.isOrganizationWide(user) ? this.prisma.beneficiary.count({}) : Promise.resolve(0),
      this.prisma.program.count({ where: { status: "ACTIVE", ...this.access.programWhere(user) } }),
      this.access.isOrganizationWide(user) ? this.prisma.organizationAuditLog.findMany({ include: { actor: { select: publicUserSelect } }, orderBy: { timestamp: "desc" }, take: 8 }) : Promise.resolve([]),
      this.access.isOrganizationWide(user) ? this.prisma.user.groupBy({ by: ["role"], _count: { role: true } }) : Promise.resolve([]),
      this.prisma.approval.findMany({
        where: { ...this.access.approvalWhere(user), status: { in: ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"] } },
        include: { requestedBy: { select: publicUserSelect }, assignedApprover: { select: publicUserSelect }, workspace: true, project: true, program: true },
        orderBy: { updatedAt: "desc" },
        take: 8
      }),
      this.prisma.approval.findMany({
        where: { ...this.access.approvalWhere(user), dueDate: { lt: today }, status: { in: ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"] } },
        include: { requestedBy: { select: publicUserSelect }, assignedApprover: { select: publicUserSelect }, workspace: true, project: true, program: true },
        orderBy: { dueDate: "asc" },
        take: 8
      }),
      this.prisma.approval.findMany({
        where: { ...this.access.approvalWhere(user), status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
        include: { requestedBy: { select: publicUserSelect }, assignedApprover: { select: publicUserSelect }, workspace: true, project: true, program: true },
        orderBy: { updatedAt: "desc" },
        take: 6
      })
    ]);

    const executiveGovernance = this.access.isOrganizationWide(user)
      ? await this.executiveGovernanceDashboard()
      : null;

    return {
      role: user.role,
      workspaceCount,
      accessibleTaskCount,
      assignedTasks,
      overdueTasks,
      dueSoonTasks,
      activeProjects,
      recentUpdates,
      upcomingMeetings,
      todaysMeetings,
      pendingActionItems,
      recentlyCompletedMeetings,
      governance: {
        activeUserCount,
        suspendedUserCount,
        beneficiaryCount,
        activeProgramCount,
        pendingApprovalsCount: pendingApprovals.length,
        executiveGovernance,
        auditActivity,
        roleDistribution
      },
      pendingApprovals,
      overdueApprovals,
      recentApprovalDecisions
    };
  }

  private meetingWhere(user: AuthenticatedUser): Prisma.MeetingWhereInput {
    if (this.access.isOrganizationWide(user)) {
      return {};
    }
    if (user.role === UserRole.PROJECT_MANAGER) {
      return {
        OR: [
          { createdById: user.sub },
          { attendees: { some: { userId: user.sub } } },
          { workspace: { members: { some: { userId: user.sub } } } },
          { project: { workspace: { members: { some: { userId: user.sub } } } } }
        ]
      };
    }
    return {
      OR: [
        { createdById: user.sub },
        { attendees: { some: { userId: user.sub } } },
        { actionItems: { some: { assignedToId: user.sub } } }
      ]
    };
  }

  private async executiveGovernanceDashboard() {
    const workspace = await this.prisma.workspace.findFirst({ where: { slug: "executive-governance" }, select: { id: true, name: true } });
    if (!workspace) {
      return null;
    }
    const today = new Date();
    const [pendingApprovals, upcomingBoardMeetings, policiesUnderReview, resolutionsAwaitingApproval, restrictedSignaturesPending, recentGovernanceAuditActivity] = await Promise.all([
      this.prisma.approval.count({ where: { workspaceId: workspace.id, status: { in: ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"] } } }),
      this.prisma.meeting.count({ where: { workspaceId: workspace.id, status: "SCHEDULED", startTime: { gte: today } } }),
      this.prisma.policy.count({ where: { workspaceId: workspace.id, status: "UNDER_REVIEW" } }),
      this.prisma.boardResolution.count({ where: { workspaceId: workspace.id, status: "UNDER_REVIEW" } }),
      this.prisma.document.count({ where: { workspaceId: workspace.id, status: { in: ["READY_FOR_SIGNATURE", "SENT_FOR_SIGNATURE", "PARTIALLY_SIGNED"] } } }),
      this.prisma.organizationAuditLog.findMany({ where: { OR: [{ entityId: workspace.id }, { metadata: { path: ["workspaceId"], equals: workspace.id } }] }, include: { actor: { select: publicUserSelect } }, orderBy: { timestamp: "desc" }, take: 5 })
    ]);
    return {
      workspace,
      pendingApprovals,
      upcomingBoardMeetings,
      policiesUnderReview,
      resolutionsAwaitingApproval,
      restrictedSignaturesPending,
      recentGovernanceAuditActivity
    };
  }
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}
