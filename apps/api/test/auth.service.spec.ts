import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
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
});
