import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  findAll() {
    return this.prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: { workspaces: true }
    });
  }

  async update(id: string, dto: UpdateOrganizationDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({ where: { id }, select: { id: true, logoUrl: true } });
    if (!existing) {
      throw new NotFoundException("Organization not found.");
    }
    if (actor.role !== UserRole.SUPER_ADMIN && dto.logoUrl !== undefined && dto.logoUrl !== existing.logoUrl) {
      throw new ForbiddenException("Only super admins can change the organization logo.");
    }
    if (actor.role !== UserRole.SUPER_ADMIN && dto.enabledAddOns !== undefined) {
      throw new ForbiddenException("Only super admins can change organization add-ons.");
    }
    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        displayName: dto.displayName || null,
        supportEmail: dto.supportEmail || null,
        logoUrl: dto.logoUrl || null,
        websiteUrl: dto.websiteUrl || null,
        missionSummary: dto.missionSummary || null,
        enabledAddOns: dto.enabledAddOns
      },
      include: { workspaces: true }
    });
    await this.audit(actor, "ORGANIZATION_PROFILE_UPDATED", "Organization", id, { name: organization.name });
    return organization;
  }

  private audit(actor: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { actorId: actor.sub, action, entityType, entityId, metadata } }).catch(() => undefined);
  }
}
