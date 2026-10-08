import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { BadRequestException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { AuthService } from "../src/modules/auth/auth.service";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("AuthService", () => {
  it("is defined with mocked dependencies", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn(() => "token") } },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } }
      ]
    }).compile();

    expect(moduleRef.get(AuthService)).toBeDefined();
  });

  it("activates a valid invitation and links applications and participants", async () => {
    const invitedUser = { id: "user-1", email: "student@example.test", status: UserStatus.INVITED };
    const invitation = { id: "invite-1", userId: invitedUser.id, acceptedAt: null, expiresAt: new Date(Date.now() + 60_000), user: invitedUser };
    const prisma = {
      mentorshipAccountInvitation: { findUnique: jest.fn().mockResolvedValue(invitation), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { update: jest.fn() },
      mentorshipApplication: { updateMany: jest.fn() },
      mentorshipParticipant: { updateMany: jest.fn() },
      organizationAuditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn()
    };
    prisma.$transaction.mockImplementation(async (operation: (transaction: typeof prisma) => unknown) => operation(prisma));
    const service = new AuthService(prisma as unknown as PrismaService, { sign: jest.fn() } as unknown as JwtService);

    await expect(service.activateInvitation({ token: "single-use-token", password: "StrongPassword123!" })).resolves.toEqual({ success: true, email: invitedUser.email });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: invitedUser.id }, data: expect.objectContaining({ status: UserStatus.ACTIVE, isActive: true, password: expect.any(String) }) }));
    expect(prisma.mentorshipAccountInvitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: invitation.id, acceptedAt: null }), data: { acceptedAt: expect.any(Date) } }));
    expect(prisma.mentorshipApplication.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { applicantUserId: invitedUser.id } }));
    expect(prisma.mentorshipParticipant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: invitedUser.id } }));
  });

  it("rejects an expired invitation", async () => {
    const prisma = {
      mentorshipAccountInvitation: { findUnique: jest.fn().mockResolvedValue({ id: "invite-1", acceptedAt: null, expiresAt: new Date(Date.now() - 60_000), user: { status: UserStatus.INVITED } }) }
    };
    const service = new AuthService(prisma as unknown as PrismaService, { sign: jest.fn() } as unknown as JwtService);
    await expect(service.activateInvitation({ token: "expired-token", password: "StrongPassword123!" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
