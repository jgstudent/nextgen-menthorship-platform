import { Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBoardDto } from "./dto/create-board.dto";
import { CreateBoardColumnDto } from "./dto/create-board-column.dto";
import { CreateBoardGroupDto } from "./dto/create-board-group.dto";

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateBoardDto, user: AuthenticatedUser) {
    await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    await this.access.assertProjectAccess(dto.projectId, user);
    return this.prisma.board.create({
      data: {
        ...dto,
        groups: {
          create: [
            { name: "Planning", color: "#1d4ed8", order: 1 },
            { name: "In Progress", color: "#d97706", order: 2 },
            { name: "Completed", color: "#15803d", order: 3 }
          ]
        },
        columns: {
          create: [
            { name: "Status", type: "STATUS", order: 1 },
            { name: "Owner", type: "PERSON", order: 2 },
            { name: "Due Date", type: "DATE", order: 3 },
            { name: "Priority", type: "DROPDOWN", order: 4 }
          ]
        }
      },
      include: { groups: true, columns: true }
    });
  }

  findAll(user: AuthenticatedUser, projectId?: string) {
    return this.prisma.board.findMany({
      where: this.access.boardWhere(user, projectId),
      orderBy: { updatedAt: "desc" },
      include: {
        project: true,
        groups: { orderBy: { order: "asc" } },
        columns: { orderBy: { order: "asc" } },
        items: { where: this.visibleBoardItemsWhere(user), include: { assignee: { select: publicUserSelect }, files: true }, orderBy: { order: "asc" } },
        _count: { select: { items: true } }
      }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertBoardAccess(id, user);
    return this.prisma.board.findUniqueOrThrow({
      where: { id },
      include: {
        project: true,
        workspace: true,
        groups: { orderBy: { order: "asc" } },
        columns: { orderBy: { order: "asc" } },
        items: {
          where: this.visibleBoardItemsWhere(user),
          orderBy: [{ groupId: "asc" }, { order: "asc" }],
          include: { assignee: { select: publicUserSelect }, comments: { include: { author: { select: publicUserSelect }, files: true } }, values: true, files: true }
        }
      }
    });
  }

  async createGroup(boardId: string, dto: CreateBoardGroupDto, user: AuthenticatedUser) {
    await this.access.assertBoardAccess(boardId, user);
    return this.prisma.boardGroup.create({
      data: {
        name: dto.name,
        ...(dto.color ? { color: dto.color } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        board: { connect: { id: boardId } }
      }
    });
  }

  async createColumn(boardId: string, dto: CreateBoardColumnDto, user: AuthenticatedUser) {
    await this.access.assertBoardAccess(boardId, user);
    return this.prisma.boardColumn.create({
      data: {
        name: dto.name,
        type: dto.type,
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.settingsJson ? { settingsJson: dto.settingsJson as Prisma.InputJsonValue } : {}),
        board: { connect: { id: boardId } }
      }
    });
  }

  private visibleBoardItemsWhere(user: AuthenticatedUser): Prisma.ItemWhereInput {
    return user.role === UserRole.VOLUNTEER ? { assigneeId: user.sub } : {};
  }
}
