import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";
import { UpdateBeneficiaryDto } from "./dto/update-beneficiary.dto";

const beneficiaryInclude = {
  user: { select: publicUserSelect },
  assignedMentor: { select: publicUserSelect },
  enrollments: { include: { program: true, assignedMentor: { select: publicUserSelect } } },
  projectAssignments: { include: { project: true } },
  workshopEnrollments: { include: { workshop: { include: { program: true } } } }
} as const;

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(dto: CreateBeneficiaryDto, user: AuthenticatedUser) {
    const beneficiary = await this.prisma.beneficiary.create({
      data: {
        organization: { connect: { id: dto.organizationId } },
        user: dto.userId ? { connect: { id: dto.userId } } : undefined,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        country: dto.country,
        city: dto.city,
        programStatus: dto.programStatus,
        notes: dto.notes,
        assignedMentor: dto.assignedMentorId ? { connect: { id: dto.assignedMentorId } } : undefined,
        onboardingDate: new Date(dto.onboardingDate),
        enrollments: {
          create: (dto.assignedProgramIds ?? []).map((programId) => ({
            program: { connect: { id: programId } },
            enrollmentDate: new Date(dto.onboardingDate),
            assignedMentor: dto.assignedMentorId ? { connect: { id: dto.assignedMentorId } } : undefined
          }))
        },
        projectAssignments: { create: (dto.assignedProjectIds ?? []).map((projectId) => ({ project: { connect: { id: projectId } } })) },
        workshopEnrollments: { create: (dto.assignedWorkshopIds ?? []).map((workshopId) => ({ workshop: { connect: { id: workshopId } } })) }
      },
      include: beneficiaryInclude
    });
    await this.audit(user, "beneficiary.created", "Beneficiary", beneficiary.id);
    return beneficiary;
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.beneficiary.findMany({ where: this.access.beneficiaryWhere(user), include: beneficiaryInclude, orderBy: { updatedAt: "desc" } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertBeneficiaryAccess(id, user);
    return this.prisma.beneficiary.findUniqueOrThrow({ where: { id }, include: beneficiaryInclude });
  }

  async update(id: string, dto: UpdateBeneficiaryDto, user: AuthenticatedUser) {
    await this.access.assertBeneficiaryAccess(id, user);
    const beneficiary = await this.prisma.beneficiary.update({
      where: { id },
      data: {
        user: dto.userId ? { connect: { id: dto.userId } } : undefined,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        country: dto.country,
        city: dto.city,
        programStatus: dto.programStatus,
        notes: dto.notes,
        assignedMentor: dto.assignedMentorId ? { connect: { id: dto.assignedMentorId } } : undefined,
        onboardingDate: dto.onboardingDate ? new Date(dto.onboardingDate) : undefined,
        ...(dto.assignedProgramIds ? {
          enrollments: {
            deleteMany: {},
            create: dto.assignedProgramIds.map((programId) => ({
              program: { connect: { id: programId } },
              enrollmentDate: new Date(dto.onboardingDate ?? new Date()),
              assignedMentor: dto.assignedMentorId ? { connect: { id: dto.assignedMentorId } } : undefined
            }))
          }
        } : {}),
        ...(dto.assignedProjectIds ? { projectAssignments: { deleteMany: {}, create: dto.assignedProjectIds.map((projectId) => ({ project: { connect: { id: projectId } } })) } } : {}),
        ...(dto.assignedWorkshopIds ? { workshopEnrollments: { deleteMany: {}, create: dto.assignedWorkshopIds.map((workshopId) => ({ workshop: { connect: { id: workshopId } } })) } } : {})
      },
      include: beneficiaryInclude
    });
    await this.audit(user, "beneficiary.updated", "Beneficiary", id);
    return beneficiary;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.access.assertBeneficiaryAccess(id, user);
    await this.audit(user, "beneficiary.deleted", "Beneficiary", id);
    return this.prisma.beneficiary.delete({ where: { id } });
  }

  async createAccount(id: string, user: AuthenticatedUser) {
    await this.access.assertBeneficiaryAccess(id, user);
    const beneficiary = await this.prisma.beneficiary.findUniqueOrThrow({ where: { id } });
    if (beneficiary.userId) {
      return this.findOne(id, user);
    }
    const email = beneficiary.email ?? `${beneficiary.firstName}.${beneficiary.lastName}.${id.slice(0, 6)}@beneficiary.nextgen.local`.toLowerCase();
    const account = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        role: UserRole.BENEFICIARY,
        status: UserStatus.INVITED,
        isActive: false,
        password: await argon2.hash(randomBytes(32).toString("hex"))
      }
    });
    await this.prisma.beneficiary.update({ where: { id }, data: { userId: account.id } });
    await this.audit(user, "beneficiary.account_created", "Beneficiary", id);
    return this.findOne(id, user);
  }

  private audit(user: AuthenticatedUser, action: string, entityType: string, entityId: string) {
    return this.prisma.organizationAuditLog.create({ data: { actorId: user.sub, action, entityType, entityId } });
  }
}
