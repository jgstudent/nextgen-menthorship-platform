import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash } from "node:crypto";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { PrismaService } from "../prisma/prisma.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ActivateInvitationDto } from "./dto/activate-invitation.dto";

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async register(dto: RegisterDto) {
    void dto;
    throw new ForbiddenException("Invite-based registration is not enabled yet. Ask an administrator to create your account.");
  }

  async activateInvitation(dto: ActivateInvitationDto) {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");
    const invitation = await this.prisma.mentorshipAccountInvitation.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw new BadRequestException("This invitation is invalid or has expired.");
    }
    if (invitation.user.status !== UserStatus.INVITED) {
      throw new BadRequestException("This account has already been activated. Sign in instead.");
    }

    const password = await argon2.hash(dto.password);
    const activatedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.mentorshipAccountInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: activatedAt } }, data: { acceptedAt: activatedAt } });
      if (claimed.count !== 1) throw new BadRequestException("This invitation is invalid or has expired.");
      await transaction.user.update({ where: { id: invitation.userId }, data: { password, status: UserStatus.ACTIVE, isActive: true } });
      await transaction.mentorshipApplication.updateMany({ where: { email: invitation.user.email, status: { in: ["APPROVED", "ELIGIBLE"] } }, data: { applicantUserId: invitation.userId } });
      await transaction.mentorshipParticipant.updateMany({ where: { application: { email: invitation.user.email } }, data: { userId: invitation.userId } });
    });
    await this.audit(invitation.userId, "auth.invitation_accepted", "MentorshipAccountInvitation", invitation.id);
    return { success: true, email: invitation.user.email };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    this.assertLoginRate(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      this.recordLoginFailure(email);
      await this.audit(null, "auth.login_failed", "User", user?.id ?? email, { email });
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (user.status !== UserStatus.ACTIVE || !user.isActive) {
      this.recordLoginFailure(email);
      await this.audit(user.id, "auth.login_blocked", "User", user.id, { email, status: user.status });
      throw new ForbiddenException("This account is not active.");
    }

    this.loginAttempts.delete(email);

    const publicUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl
    };

    await this.audit(user.id, "auth.login_success", "User", user.id, { email });
    return { user: publicUser, accessToken: this.sign(publicUser) };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicUserSelect
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl || null
      },
      select: publicUserSelect
    });
    await this.audit(userId, "auth.profile_updated", "User", userId, { avatarUrl: Boolean(dto.avatarUrl) });
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await argon2.verify(user.password, dto.currentPassword))) {
      throw new UnauthorizedException("Current password is incorrect.");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await argon2.hash(dto.newPassword) }
    });
    await this.audit(userId, "auth.password_changed", "User", userId);
    return { success: true };
  }

  logout() {
    return { success: true };
  }

  private sign(user: { id: string; email: string; role: UserRole }) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  }

  private assertLoginRate(email: string) {
    const attempt = this.loginAttempts.get(email);
    if (!attempt) {
      return;
    }
    if (Date.now() > attempt.resetAt) {
      this.loginAttempts.delete(email);
      return;
    }
    if (attempt.count >= 10) {
      throw new UnauthorizedException("Too many login attempts. Please try again later.");
    }
  }

  private recordLoginFailure(email: string) {
    const resetAt = Date.now() + 15 * 60 * 1000;
    const attempt = this.loginAttempts.get(email);
    this.loginAttempts.set(email, { count: (attempt?.count ?? 0) + 1, resetAt: attempt?.resetAt ?? resetAt });
  }

  private audit(actorId: string | null, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.organizationAuditLog.create({ data: { actorId, action, entityType, entityId, metadata } }).catch(() => undefined);
  }
}
