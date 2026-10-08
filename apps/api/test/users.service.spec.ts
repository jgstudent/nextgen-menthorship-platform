import { ForbiddenException } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../src/common/types/authenticated-user";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { UsersService } from "../src/modules/users/users.service";

describe("UsersService login administration", () => {
  const executive: AuthenticatedUser = { sub: "executive-1", email: "executive@example.test", role: UserRole.EXECUTIVE };
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    organizationAuditLog: { create: jest.fn() }
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("prevents non-super-admins from changing user accounts", async () => {
    await expect(service.update("user-1", { firstName: "Changed" }, executive)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.setStatus("user-1", UserStatus.SUSPENDED, executive)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("prevents non-super-admins from requesting login invitations", async () => {
    await expect(service.invitePlaceholder("user-1", executive)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
