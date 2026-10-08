import { randomBytes } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { AuthController } from "../src/modules/auth/auth.controller";
import { AuthService } from "../src/modules/auth/auth.service";
import { JwtStrategy } from "../src/modules/auth/jwt.strategy";
import { MentorshipModule } from "../src/modules/mentorship/mentorship.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("Mentorship HTTP boundary with existing authentication", () => {
  let app: INestApplication;
  let base: string;
  let jwt: JwtService;
  const password = randomBytes(24).toString("hex");
  const secret = randomBytes(48).toString("hex");
  const findUnique = jest.fn();
  let account: { id: string; email: string; password: string; role: UserRole; status: UserStatus; isActive: boolean; firstName: string; lastName: string } | null;

  beforeAll(async () => {
    jwt = new JwtService({ secret });
    const prismaMock = {
      user: { findUnique, findUniqueOrThrow: jest.fn(() => ({ id: "admin", role: account?.role })) },
      organizationAuditLog: { create: jest.fn().mockResolvedValue({}) }
    };
    const module = await Test.createTestingModule({
      imports: [MentorshipModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } }
      ]
    }).overrideProvider(PrismaService).useValue(prismaMock).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });

  beforeEach(async () => {
    account = { id: "admin", email: "admin@example.test", password: await argon2.hash(password), role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, isActive: true, firstName: "Test", lastName: "Admin" };
    findUnique.mockImplementation(async () => account);
  });

  afterAll(async () => { await app?.close(); });

  const get = (token?: string) => fetch(`${base}/api/mentorship/foundation`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const token = () => jwt.sign({ sub: "admin", email: "admin@example.test", role: UserRole.SUPER_ADMIN });

  it("rejects unauthenticated requests", async () => {
    expect((await get()).status).toBe(401);
  });

  it("rejects a forged signature", async () => {
    expect((await get(new JwtService({ secret: "untrusted-test-key" }).sign({ sub: "admin" }))).status).toBe(401);
  });

  it("rejects expired tokens", async () => {
    expect((await get(jwt.sign({ sub: "admin" }, { expiresIn: -1 }))).status).toBe(401);
  });

  it.each([UserRole.SUPER_ADMIN, UserRole.EXECUTIVE])("allows %s and returns only configuration metadata", async (role) => {
    account!.role = role;
    const response = await get(token());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ phase: 1, status: "PARTICIPANT_INTAKE", enrollmentOpen: false });
  });

  it.each([UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER, UserRole.BENEFICIARY, UserRole.SPONSOR_VIEWER])("denies %s even when an old JWT claims SUPER_ADMIN", async (role) => {
    account!.role = role;
    expect((await get(token())).status).toBe(403);
  });

  it.each([UserStatus.INVITED, UserStatus.SUSPENDED, UserStatus.DISABLED, UserStatus.PENDING_APPROVAL])("denies an account with status %s", async (status) => {
    account!.status = status;
    expect((await get(token())).status).toBe(401);
  });

  it("denies inactive and deleted accounts", async () => {
    account!.isActive = false;
    expect((await get(token())).status).toBe(401);
    account = null;
    expect((await get(token())).status).toBe(401);
  });

  it("preserves login, profile lookup, and logout routes", async () => {
    const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.test", password }) });
    expect(login.status).toBe(201);
    const result = await login.json() as { accessToken: string; user: Record<string, unknown> };
    expect(result.user).not.toHaveProperty("password");
    expect((await get(result.accessToken)).status).toBe(200);
    const headers = { Authorization: `Bearer ${result.accessToken}` };
    expect((await fetch(`${base}/api/auth/me`, { headers })).status).toBe(200);
    expect((await fetch(`${base}/api/auth/logout`, { headers, method: "POST" })).status).toBe(201);
  });

  it("does not enable public registration", async () => {
    const response = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(response.status).toBe(403);
  });

  it("keeps participant approval and account invitation restricted to Super Admin", async () => {
    account!.role = UserRole.EXECUTIVE;
    const response = await fetch(`${base}/api/mentorship/programs/program-1/applications/application-1/review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "APPROVED" })
    });
    expect(response.status).toBe(403);
  });
});
