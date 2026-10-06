import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [".env", "apps/api/.env", "apps/web/.env.local"];
if (targets.some((path) => existsSync(resolve(root, path)))) {
  throw new Error("Local environment files already exist. Review them manually; setup will not overwrite credentials.");
}

const password = randomBytes(24).toString("hex");
const values = {
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://nextgen_mentorship:${password}@127.0.0.1:56478/nextgen_mentorship?schema=public`,
  JWT_SECRET: randomBytes(48).toString("hex"),
  JWT_EXPIRES_IN: "1d",
  API_PORT: "4100",
  WEB_APP_URL: "http://localhost:3100",
  MINIO_ENDPOINT: "127.0.0.1",
  MINIO_PORT: "59000",
  MINIO_ACCESS_KEY: "nextgen_mentorship",
  MINIO_SECRET_KEY: randomBytes(24).toString("hex"),
  MINIO_BUCKET: "nextgen-mentorship-files",
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: "56379",
  ADMIN_EMAIL: "admin@nextgen.local",
  ADMIN_PASSWORD: randomBytes(24).toString("hex"),
  DOCUSEAL_BASE_URL: "",
  DOCUSEAL_API_KEY: "",
  DOCUSEAL_WEBHOOK_SECRET: ""
};
const format = (entries) => Object.entries(entries).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n";
for (const path of [".env", "apps/api/.env"]) {
  mkdirSync(dirname(resolve(root, path)), { recursive: true });
  writeFileSync(resolve(root, path), format(values), { flag: "wx", mode: 0o600 });
}
writeFileSync(resolve(root, "apps/web/.env.local"), format({
  NEXT_PUBLIC_API_URL: "http://localhost:4100/api",
  API_INTERNAL_URL: "http://localhost:4100/api"
}), { flag: "wx", mode: 0o600 });
console.log("Created independent local environment files. Admin login: admin@nextgen.local. Read ADMIN_PASSWORD locally in apps/api/.env; never commit it.");
