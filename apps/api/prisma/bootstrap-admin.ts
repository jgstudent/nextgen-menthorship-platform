import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

export function loadBootstrapEnvironment(path = resolve(__dirname, "../.env")) {
  if (existsSync(path)) {
    const values = parseEnv(readFileSync(path, "utf8"));
    for (const key of ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]) {
      if (process.env[key] !== undefined && values[key] !== undefined && process.env[key] !== values[key]) {
        throw new Error(`${key} conflicts with apps/api/.env. Clear the inherited variable or align the configuration before continuing.`);
      }
    }
    for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
  }
  const email = (process.env.ADMIN_EMAIL ?? "admin@nextgen.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16) throw new Error("Set ADMIN_PASSWORD to at least 16 characters before continuing.");
  return { email, password };
}

export async function verifyBootstrapAdmin(admin: { password: string; role: UserRole; status: UserStatus; isActive: boolean }, password: string) {
  const matches = await argon2.verify(admin.password, password).catch(() => false);
  if (!matches || admin.role !== UserRole.SUPER_ADMIN || admin.status !== UserStatus.ACTIVE || !admin.isActive) {
    throw new Error("The existing bootstrap admin does not match the configured active SUPER_ADMIN credentials. No password was overwritten. Review apps/api/.env and the database target; use db:reset-admin only for an intentional recovery.");
  }
}
