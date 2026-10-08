import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".env.staging");

if (existsSync(target)) {
  throw new Error(".env.staging already exists. It was not overwritten.");
}

const values = {
  RELEASE_VERSION: "0.1.0-staging.1",
  POSTGRES_PASSWORD: randomBytes(24).toString("hex"),
  JWT_SECRET: randomBytes(48).toString("hex"),
  JWT_EXPIRES_IN: "1d",
  ADMIN_EMAIL: "admin@nextgen.local",
  ADMIN_PASSWORD: randomBytes(24).toString("hex"),
  MINIO_ACCESS_KEY: "nextgen_mentorship",
  MINIO_SECRET_KEY: randomBytes(24).toString("hex"),
  MINIO_BUCKET: "nextgen-mentorship-files",
  STAGING_WEB_PORT: "3100",
  STAGING_API_PORT: "4100",
  STAGING_STORAGE_PORT: "59000",
  STAGING_WEB_ORIGIN: "http://localhost:3100",
  STAGING_PUBLIC_HOST: "localhost",
  STAGING_PUBLIC_USE_SSL: "false",
  NEXT_PUBLIC_POTAY_URL: "https://portal.nextgenhaitian.org",
  DOCUSEAL_BASE_URL: "",
  DOCUSEAL_API_KEY: "",
  DOCUSEAL_WEBHOOK_SECRET: "",
  RESEND_API_KEY: "",
  EMAIL_FROM: "Pilye <no-reply@nextgenhaitian.org>",
  EMAIL_REPLY_TO: "",
  EMAIL_DELIVERY_URL: "",
  EMAIL_DELIVERY_TOKEN: ""
};

const contents = Object.entries(values)
  .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
  .join("\n") + "\n";

writeFileSync(target, contents, { flag: "wx", mode: 0o600 });
console.log("Created .env.staging with independent staging credentials.");
console.log("Admin login: admin@nextgen.local. Read ADMIN_PASSWORD from .env.staging.");
