import { Injectable } from "@nestjs/common";
import { Prisma, ProjectStatus, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    return this.prisma.project.create({
      data: {
        organization: { connect: { id: dto.organizationId } },
        workspace: { connect: { id: dto.workspaceId } },
        program: dto.programId ? { connect: { id: dto.programId } } : undefined,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        boards: {
          create: {
            workspace: { connect: { id: dto.workspaceId } },
            name: `${dto.name} Board`,
            description: "Default board for project tasks.",
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
          }
        }
      },
      include: { workspace: true, boards: true }
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.project.findMany({
      where: this.access.projectWhere(user),
      orderBy: { updatedAt: "desc" },
      include: {
        workspace: true,
        boards: { include: { _count: { select: { items: true } } } }
      }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertProjectAccess(id, user);
    return this.prisma.project.findUniqueOrThrow({
      where: { id },
      include: {
        workspace: true,
        boards: {
          include: {
            groups: { orderBy: { order: "asc" } },
            columns: { orderBy: { order: "asc" } },
            items: { where: this.visibleBoardItemsWhere(user), include: { assignee: { select: publicUserSelect } }, orderBy: { order: "asc" } }
          }
        }
      }
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertProjectAccess(id, user);
    const project = await this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
      include: { workspace: true, boards: true }
    });
    await this.prisma.organizationAuditLog.create({ data: { actorId: user.sub, action: "project.archived", entityType: "Project", entityId: id, metadata: { name: project.name } } });
    return project;
  }

  private visibleBoardItemsWhere(user: AuthenticatedUser): Prisma.ItemWhereInput {
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { id: "__no_sponsor_task_access__" };
    }
    if (user.role === UserRole.VOLUNTEER || user.role === UserRole.BENEFICIARY) {
      return { archivedAt: null, assigneeId: user.sub };
    }
    return { archivedAt: null };
  }
}
