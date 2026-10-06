import { Injectable } from "@nestjs/common";
import { Prisma, ProgramStatus, ProjectStatus, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProgramDto } from "./dto/create-program.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";

const programInclude = {
  workspace: true,
  owner: { select: publicUserSelect },
  projects: { where: { status: { not: ProjectStatus.ARCHIVED } } },
  workshops: { where: { archivedAt: null } },
  enrollments: { include: { beneficiary: true, assignedMentor: { select: publicUserSelect } } }
} as const;

const sponsorProgramInclude = {
  workspace: true,
  owner: { select: publicUserSelect },
  projects: { where: { status: { not: ProjectStatus.ARCHIVED } } },
  workshops: { where: { archivedAt: null } }
} as const;

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateProgramDto, user: AuthenticatedUser) {
    await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    const program = await this.prisma.program.create({ data: this.toCreateData(dto), include: programInclude });
    await this.audit(user, "program.created", "Program", program.id, { name: program.name });
    return program;
  }

  findAll(user: AuthenticatedUser) {
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return this.prisma.program.findMany({ where: this.access.programWhere(user), include: sponsorProgramInclude, orderBy: { updatedAt: "desc" } });
    }
    return this.prisma.program.findMany({ where: this.access.programWhere(user), include: programInclude, orderBy: { updatedAt: "desc" } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertProgramAccess(id, user);
    if (user.role === UserRole.SPONSOR_VIEWER) {
      return this.prisma.program.findUniqueOrThrow({ where: { id }, include: sponsorProgramInclude });
    }
    return this.prisma.program.findUniqueOrThrow({ where: { id }, include: programInclude });
  }

  async update(id: string, dto: UpdateProgramDto, user: AuthenticatedUser) {
    await this.access.assertProgramAccess(id, user);
    if (dto.workspaceId) {
      await this.access.assertWorkspaceAccess(dto.workspaceId, user);
    }
    const program = await this.prisma.program.update({ where: { id }, data: this.toUpdateData(dto), include: programInclude });
    await this.audit(user, "program.updated", "Program", id, { name: program.name });
    return program;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertProgramAccess(id, user);
    const program = await this.prisma.program.update({ where: { id }, data: { status: ProgramStatus.ARCHIVED }, include: programInclude });
    await this.audit(user, "program.archived", "Program", id, { name: program.name });
    return program;
  }

  private toCreateData(dto: CreateProgramDto): Prisma.ProgramCreateInput {
    return {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      visibility: dto.visibility,
      status: dto.status,
      owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      workspace: { connect: { id: dto.workspaceId } },
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined
    };
  }

  private toUpdateData(dto: UpdateProgramDto): Prisma.ProgramUpdateInput {
    return {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      visibility: dto.visibility,
      status: dto.status,
      owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      workspace: dto.workspaceId ? { connect: { id: dto.workspaceId } } : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined
    };
  }

  private audit(user: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { actorId: user.sub, action, entityType, entityId, metadata } });
  }
}
