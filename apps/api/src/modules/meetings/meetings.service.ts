import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MeetingActionItemStatus, MeetingAttendeeRole, MeetingResponseStatus, Prisma, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { ConvertActionItemDto } from "./dto/convert-action-item.dto";
import { CreateActionItemDto } from "./dto/create-action-item.dto";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";

const meetingInclude = {
  workspace: true,
  project: true,
  createdBy: { select: publicUserSelect },
  attendees: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: "asc" } },
  actionItems: { include: { assignedTo: { select: publicUserSelect }, convertedTask: true }, orderBy: { createdAt: "asc" } }
} satisfies Prisma.MeetingInclude;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateMeetingDto, user: AuthenticatedUser) {
    await this.assertMeetingScope(dto.workspaceId, dto.projectId, user);
    const attendees = uniqueAttendees([...(dto.attendees ?? []), { userId: user.sub, role: MeetingAttendeeRole.HOST, responseStatus: MeetingResponseStatus.ACCEPTED }]);

    const meeting = await this.prisma.meeting.create({
      data: {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        videoUrl: dto.videoUrl,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: dto.status,
        agenda: dto.agenda,
        notes: dto.notes,
        createdById: user.sub,
        attendees: {
          create: attendees.map((attendee) => ({
            userId: attendee.userId,
            role: attendee.role ?? MeetingAttendeeRole.REQUIRED,
            responseStatus: attendee.responseStatus ?? MeetingResponseStatus.PENDING
          }))
        }
      },
      include: meetingInclude
    });
    await this.audit(user, "MEETING_CREATED", meeting.id, { workspaceId: meeting.workspaceId, projectId: meeting.projectId, status: meeting.status });
    return meeting;
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.meeting.findMany({
      where: this.meetingWhere(user),
      include: meetingInclude,
      orderBy: { startTime: "asc" }
    });
  }

  async findMembers(user: AuthenticatedUser) {
    if (this.access.isOrganizationWide(user)) {
      return this.prisma.user.findMany({ where: { isActive: true }, select: publicUserSelect, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { workspace: this.access.workspaceWhere(user) },
      select: { user: { select: publicUserSelect } }
    });
    return Array.from(new Map(memberships.map((membership) => [membership.user.id, membership.user])).values()).sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`));
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.assertMeetingAccess(id, user);
    return this.prisma.meeting.findUniqueOrThrow({ where: { id }, include: meetingInclude });
  }

  async update(id: string, dto: UpdateMeetingDto, user: AuthenticatedUser) {
    await this.assertMeetingManageAccess(id, user);
    await this.assertMeetingScope(dto.workspaceId, dto.projectId, user);

    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        videoUrl: dto.videoUrl,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        status: dto.status,
        agenda: dto.agenda,
        notes: dto.notes,
        ...(dto.attendees
          ? {
              attendees: {
                deleteMany: {},
                create: uniqueAttendees(dto.attendees).map((attendee) => ({
                  userId: attendee.userId,
                  role: attendee.role ?? MeetingAttendeeRole.REQUIRED,
                  responseStatus: attendee.responseStatus ?? MeetingResponseStatus.PENDING
                }))
              }
            }
          : {})
      },
      include: meetingInclude
    });
    await this.audit(user, "MEETING_UPDATED", meeting.id, { workspaceId: meeting.workspaceId, projectId: meeting.projectId, status: meeting.status });
    return meeting;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.assertMeetingManageAccess(id, user);
    await this.audit(user, "MEETING_DELETED", id, {});
    return this.prisma.meeting.delete({ where: { id } });
  }

  async createActionItem(meetingId: string, dto: CreateActionItemDto, user: AuthenticatedUser) {
    await this.assertMeetingAccess(meetingId, user);
    await this.assertActionItemAssignee(dto.assignedToId, meetingId, user);
    const actionItem = await this.prisma.meetingActionItem.create({
      data: {
        meetingId,
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status
      },
      include: { assignedTo: { select: publicUserSelect }, convertedTask: true }
    });
    await this.audit(user, "MEETING_ACTION_ITEM_CREATED", meetingId, { actionItemId: actionItem.id, assignedToId: actionItem.assignedToId });
    return actionItem;
  }

  async convertActionItemToTask(meetingId: string, actionItemId: string, dto: ConvertActionItemDto, user: AuthenticatedUser) {
    await this.assertMeetingManageAccess(meetingId, user);
    const actionItem = await this.prisma.meetingActionItem.findFirst({
      where: { id: actionItemId, meetingId },
      include: { meeting: true }
    });
    if (!actionItem) {
      throw new NotFoundException("Action item not found.");
    }
    if (actionItem.convertedTaskId) {
      throw new BadRequestException("Action item is already converted to a task.");
    }

    const board = dto.boardId ? await this.boardForConversion(dto.boardId, user) : await this.defaultBoardForMeeting(actionItem.meeting, user);
    const task = await this.prisma.item.create({
      data: {
        board: { connect: { id: board.id } },
        group: dto.groupId ? { connect: { id: dto.groupId } } : undefined,
        title: actionItem.title,
        description: actionItem.description ?? `Created from meeting: ${actionItem.meeting.title}`,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        assignee: actionItem.assignedToId ? { connect: { id: actionItem.assignedToId } } : undefined,
        dueDate: actionItem.dueDate
      },
      include: { assignee: { select: publicUserSelect }, group: true, files: true }
    });

    await this.prisma.meetingActionItem.update({
      where: { id: actionItem.id },
      data: { convertedTaskId: task.id, status: MeetingActionItemStatus.CONVERTED_TO_TASK }
    });
    await this.audit(user, "MEETING_ACTION_ITEM_CONVERTED", meetingId, { actionItemId: actionItem.id, taskId: task.id });

    return task;
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

  private async assertMeetingAccess(id: string, user: AuthenticatedUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id, ...this.meetingWhere(user) }, select: { id: true } });
    if (!meeting) {
      throw new NotFoundException("Meeting not found.");
    }
  }

  private async assertMeetingManageAccess(id: string, user: AuthenticatedUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id, ...this.meetingWhere(user) }, select: { id: true, createdById: true, workspaceId: true, projectId: true } });
    if (!meeting) {
      throw new NotFoundException("Meeting not found.");
    }
    if (this.access.isOrganizationWide(user) || user.role === UserRole.PROJECT_MANAGER || meeting.createdById === user.sub) {
      return;
    }
    throw new ForbiddenException("You do not have permission to manage this meeting.");
  }

  private async assertMeetingScope(workspaceId: string | undefined, projectId: string | undefined, user: AuthenticatedUser) {
    if (workspaceId) {
      await this.access.assertWorkspaceAccess(workspaceId, user);
    }
    if (projectId) {
      await this.access.assertProjectAccess(projectId, user);
    }
  }

  private async assertActionItemAssignee(assignedToId: string | undefined, meetingId: string, user: AuthenticatedUser) {
    if (!assignedToId || this.access.isOrganizationWide(user)) {
      return;
    }
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId }, select: { workspaceId: true } });
    if (meeting?.workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: meeting.workspaceId, userId: assignedToId } } });
      if (!member) {
        throw new BadRequestException("Assigned user is not a member of this meeting workspace.");
      }
    }
  }

  private async boardForConversion(boardId: string, user: AuthenticatedUser) {
    await this.access.assertBoardAccess(boardId, user);
    return this.prisma.board.findUniqueOrThrow({ where: { id: boardId }, select: { id: true } });
  }

  private async defaultBoardForMeeting(meeting: { projectId: string | null; workspaceId: string | null }, user: AuthenticatedUser) {
    const board = await this.prisma.board.findFirst({
      where: {
        ...this.access.boardWhere(user),
        ...(meeting.projectId ? { projectId: meeting.projectId } : {}),
        ...(meeting.workspaceId ? { workspaceId: meeting.workspaceId } : {})
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" }
    });
    if (!board) {
      throw new BadRequestException("No accessible board is available for this meeting.");
    }
    return board;
  }

  private audit(user: AuthenticatedUser, action: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({
      data: {
        actorId: user.sub,
        action,
        entityType: "Meeting",
        entityId,
        metadata
      }
    });
  }
}

function uniqueAttendees(attendees: Array<{ userId: string; role?: MeetingAttendeeRole; responseStatus?: MeetingResponseStatus }>) {
  return Array.from(new Map(attendees.map((attendee) => [attendee.userId, attendee])).values());
}
