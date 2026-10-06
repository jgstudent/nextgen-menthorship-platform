import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const userInclude = {
  memberships: { include: { workspace: true } },
  programAssignments: { include: { program: true } },
  projectAssignments: { include: { project: true } },
  beneficiaryProfile: true
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        ...publicUserSelect,
        createdAt: true,
        updatedAt: true,
        memberships: { include: { workspace: true } },
        programAssignments: { include: { program: true } },
        projectAssignments: { include: { project: true } },
        beneficiaryProfile: true
      },
      orderBy: [{ role: "asc" }, { lastName: "asc" }]
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, createdAt: true, updatedAt: true, ...userInclude } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can create users.");
    }
    this.assertCanSetRole(dto.role, actor);
    const email = dto.email.toLowerCase();
    const temporaryPassword = dto.temporaryPassword ?? dto.password;
    if (!temporaryPassword) {
      throw new BadRequestException("A temporary password is required.");
    }
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new BadRequestException("A user with this email already exists.");
    }
    const password = await argon2.hash(temporaryPassword);
    const workspaceAssignments = dto.workspaceAssignments ?? (dto.workspaceIds ?? []).map((workspaceId) => ({ workspaceId, role: dto.role }));
    const programAssignments = dto.programAssignments ?? (dto.programIds ?? []).map((programId) => ({ programId, role: dto.role }));
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl || undefined,
        role: dto.role,
        status: dto.status ?? UserStatus.ACTIVE,
        isActive: (dto.status ?? UserStatus.ACTIVE) === UserStatus.ACTIVE,
        password,
        memberships: { create: workspaceAssignments.map((assignment) => ({ workspaceId: assignment.workspaceId, role: assignment.role })) },
        programAssignments: { create: programAssignments.map((assignment) => ({ programId: assignment.programId, role: assignment.role })) },
        projectAssignments: { create: (dto.projectAssignments ?? []).map((assignment) => ({ projectId: assignment.projectId, role: assignment.role })) }
      },
      include: userInclude
    });
    await this.audit(actor, "USER_CREATED", "User", user.id, { email: user.email, role: user.role, status: user.status });
    await this.audit(actor, "ROLE_ASSIGNED", "User", user.id, { role: user.role });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("User not found.");
    }
    if (dto.role) {
      this.assertCanSetRole(dto.role, actor);
      if (actor.role === UserRole.EXECUTIVE && current.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException("Executives cannot modify super admin accounts.");
      }
    }
    if (actor.sub === id && dto.role && dto.role !== current.role) {
      throw new BadRequestException("Users cannot change their own role.");
    }

    const status = dto.status;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
        role: dto.role,
        status,
        isActive: status ? status === UserStatus.ACTIVE : undefined,
        ...(dto.password ? { password: await argon2.hash(dto.password) } : {}),
        ...(dto.workspaceAssignments ? { memberships: { deleteMany: {}, create: dto.workspaceAssignments.map((assignment) => ({ workspaceId: assignment.workspaceId, role: assignment.role })) } } : {}),
        ...(dto.programAssignments ? { programAssignments: { deleteMany: {}, create: dto.programAssignments.map((assignment) => ({ programId: assignment.programId, role: assignment.role })) } } : {}),
        ...(dto.projectAssignments ? { projectAssignments: { deleteMany: {}, create: dto.projectAssignments.map((assignment) => ({ projectId: assignment.projectId, role: assignment.role })) } } : {})
      },
      include: userInclude
    });
    await this.audit(actor, "user.updated", "User", id, { role: user.role, status: user.status });
    return this.sanitize(user);
  }

  async setStatus(id: string, status: UserStatus, actor: AuthenticatedUser) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("User not found.");
    }
    if (actor.role === UserRole.EXECUTIVE && current.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Executives cannot change super admin status.");
    }
    const user = await this.prisma.user.update({ where: { id }, data: { status, isActive: status === UserStatus.ACTIVE }, include: userInclude });
    await this.audit(actor, status === UserStatus.ACTIVE ? "user.reactivated" : "user.suspended", "User", id, { status });
    return this.sanitize(user);
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, actor: AuthenticatedUser) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can reset user passwords.");
    }
    await this.ensureExists(id);
    await this.prisma.user.update({
      where: { id },
      data: { password: await argon2.hash(dto.temporaryPassword), status: UserStatus.ACTIVE, isActive: true }
    });
    await this.audit(actor, "USER_PASSWORD_RESET", "User", id);
    return { success: true, message: "Temporary password saved. Share it securely with the user." };
  }

  async invitePlaceholder(id: string, actor: AuthenticatedUser) {
    await this.ensureExists(id);
    await this.audit(actor, "user.invite_requested", "User", id);
    return { success: true, message: "Invite workflow placeholder recorded." };
  }

  private assertCanSetRole(role: UserRole, actor: AuthenticatedUser) {
    if (actor.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can create or assign super admin access.");
    }
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
  }

  private sanitize<T extends { password?: string }>(user: T) {
    const { password, ...safe } = user;
    void password;
    return safe;
  }

  private audit(actor: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { actorId: actor.sub, action, entityType, entityId, metadata } });
  }
}
