import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateTaskDto, user: AuthenticatedUser) {
    await this.access.assertBoardAccess(dto.boardId, user);
    return this.prisma.item.create({
      data: this.toCreateInput(dto),
      include: { assignee: { select: publicUserSelect }, group: true, files: true }
    });
  }

  findAll(user: AuthenticatedUser, boardId?: string) {
    return this.prisma.item.findMany({
      where: this.access.taskWhere(user, boardId),
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      include: {
        board: { include: { project: true } },
        group: true,
        assignee: { select: publicUserSelect },
        comments: true,
        files: true
      }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertTaskAccess(id, user);
    return this.prisma.item.findUniqueOrThrow({
      where: { id },
      include: {
        board: true,
        group: true,
        assignee: { select: publicUserSelect },
        comments: { include: { author: { select: publicUserSelect }, files: true }, orderBy: { createdAt: "asc" } },
        values: { include: { column: true } },
        files: true
      }
    });
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthenticatedUser) {
    await this.access.assertTaskAccess(id, user);
    if (dto.boardId) {
      await this.access.assertBoardAccess(dto.boardId, user);
    }
    return this.prisma.item.update({
      where: { id },
      data: this.toUpdateInput(dto),
      include: { assignee: { select: publicUserSelect }, group: true, files: true }
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertTaskAccess(id, user);
    const task = await this.prisma.item.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { assignee: { select: publicUserSelect }, group: true, files: true }
    });
    await this.prisma.organizationAuditLog.create({ data: { actorId: user.sub, action: "task.archived", entityType: "Task", entityId: id, metadata: { title: task.title } } });
    return task;
  }

  private toCreateInput(dto: CreateTaskDto): Prisma.ItemCreateInput {
    return {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      order: dto.order,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      board: { connect: { id: dto.boardId } },
      group: dto.groupId ? { connect: { id: dto.groupId } } : undefined,
      assignee: dto.assigneeId ? { connect: { id: dto.assigneeId } } : undefined
    };
  }

  private toUpdateInput(dto: UpdateTaskDto): Prisma.ItemUpdateInput {
    return {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      order: dto.order,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      board: dto.boardId ? { connect: { id: dto.boardId } } : undefined,
      group: dto.groupId ? { connect: { id: dto.groupId } } : undefined,
      assignee: dto.assigneeId ? { connect: { id: dto.assigneeId } } : undefined
    };
  }
}
