import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { loadBootstrapEnvironment, verifyBootstrapAdmin } from "../prisma/bootstrap-admin";

describe("bootstrap admin", () => {
  const original = { ...process.env };
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "nextgen-bootstrap-"));
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAIL;
    delete process.env.DATABASE_URL;
  });
  afterEach(() => {
    process.env = { ...original };
    rmSync(folder, { recursive: true });
  });

  it("loads setup's quoted password exactly, without quote characters", () => {
    const password = randomBytes(24).toString("hex");
    const path = join(folder, ".env");
    writeFileSync(path, `ADMIN_PASSWORD=${JSON.stringify(password)}\nADMIN_EMAIL="admin@nextgen.local"\n`);
    expect(loadBootstrapEnvironment(path)).toEqual({ email: "admin@nextgen.local", password });
  });

  it("rejects conflicting inherited credentials without disclosing either value", () => {
    const password = randomBytes(24).toString("hex");
    const path = join(folder, ".env");
    writeFileSync(path, `ADMIN_PASSWORD="${password}"\n`);
    process.env.ADMIN_PASSWORD = randomBytes(24).toString("hex");
    expect(() => loadBootstrapEnvironment(path)).toThrow("ADMIN_PASSWORD conflicts");
    try { loadBootstrapEnvironment(path); } catch (error) { expect(String(error)).not.toContain(password); }
  });

  it("verifies a fresh Argon2 hash and rejects a different saved password", async () => {
    const password = randomBytes(24).toString("hex");
    const admin = { password: await argon2.hash(password), role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, isActive: true };
    await expect(verifyBootstrapAdmin(admin, password)).resolves.toBeUndefined();
    await expect(verifyBootstrapAdmin(admin, randomBytes(24).toString("hex"))).rejects.toThrow("No password was overwritten");
    await expect(verifyBootstrapAdmin({ ...admin, isActive: false }, password)).rejects.toThrow("active SUPER_ADMIN");
  });
});
