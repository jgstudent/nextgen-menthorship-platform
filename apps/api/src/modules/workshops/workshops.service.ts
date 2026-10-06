import { Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkshopDto } from "./dto/create-workshop.dto";
import { UpdateWorkshopDto } from "./dto/update-workshop.dto";

const workshopInclude = {
  program: true,
  instructor: { select: publicUserSelect },
  enrollments: { include: { beneficiary: true, user: { select: publicUserSelect } } }
} as const;

const restrictedWorkshopInclude = {
  program: true,
  instructor: { select: publicUserSelect }
} as const;

@Injectable()
export class WorkshopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateWorkshopDto, user: AuthenticatedUser) {
    await this.access.assertProgramAccess(dto.programId, user);
    const workshop = await this.prisma.workshop.create({ data: this.toCreateData(dto), include: workshopInclude });
    await this.audit(user, "workshop.created", "Workshop", workshop.id, { title: workshop.title });
    return workshop;
  }

  findAll(user: AuthenticatedUser) {
    if (user.role === UserRole.SPONSOR_VIEWER || user.role === UserRole.BENEFICIARY) {
      return this.prisma.workshop.findMany({ where: this.access.workshopWhere(user), include: restrictedWorkshopInclude, orderBy: { startTime: "asc" } });
    }
    return this.prisma.workshop.findMany({ where: this.access.workshopWhere(user), include: workshopInclude, orderBy: { startTime: "asc" } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertWorkshopAccess(id, user);
    if (user.role === UserRole.SPONSOR_VIEWER || user.role === UserRole.BENEFICIARY) {
      return this.prisma.workshop.findUniqueOrThrow({ where: { id }, include: restrictedWorkshopInclude });
    }
    return this.prisma.workshop.findUniqueOrThrow({ where: { id }, include: workshopInclude });
  }

  async update(id: string, dto: UpdateWorkshopDto, user: AuthenticatedUser) {
    await this.access.assertWorkshopAccess(id, user);
    if (dto.programId) {
      await this.access.assertProgramAccess(dto.programId, user);
    }
    const workshop = await this.prisma.workshop.update({ where: { id }, data: this.toUpdateData(dto), include: workshopInclude });
    await this.audit(user, "workshop.updated", "Workshop", id, { title: workshop.title });
    return workshop;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertWorkshopAccess(id, user);
    const workshop = await this.prisma.workshop.update({ where: { id }, data: { archivedAt: new Date() }, include: workshopInclude });
    await this.audit(user, "workshop.archived", "Workshop", id, { title: workshop.title });
    return workshop;
  }

  private toCreateData(dto: CreateWorkshopDto): Prisma.WorkshopCreateInput {
    return {
      title: dto.title,
      description: dto.description,
      program: { connect: { id: dto.programId } },
      instructor: dto.instructorId ? { connect: { id: dto.instructorId } } : undefined,
      location: dto.location,
      virtualMeetingUrl: dto.virtualMeetingUrl,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      capacity: dto.capacity,
      visibility: dto.visibility
    };
  }

  private toUpdateData(dto: UpdateWorkshopDto): Prisma.WorkshopUpdateInput {
    return {
      title: dto.title,
      description: dto.description,
      program: dto.programId ? { connect: { id: dto.programId } } : undefined,
      instructor: dto.instructorId ? { connect: { id: dto.instructorId } } : undefined,
      location: dto.location,
      virtualMeetingUrl: dto.virtualMeetingUrl,
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      capacity: dto.capacity,
      visibility: dto.visibility
    };
  }

  private audit(user: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { actorId: user.sub, action, entityType, entityId, metadata } });
  }
}
