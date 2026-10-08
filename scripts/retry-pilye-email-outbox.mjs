import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.staging");
if (!existsSync(envPath)) throw new Error(".env.staging is missing.");
const env = Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
  const split = line.indexOf("=");
  const key = line.slice(0, split);
  const raw = line.slice(split + 1);
  try { return [key, JSON.parse(raw)]; } catch { return [key, raw]; }
}));

const recipients = process.argv.slice(2).map((recipient) => recipient.trim().toLowerCase()).filter(Boolean);
if (!recipients.length) throw new Error("Provide at least one recipient email. This safeguard prevents an accidental retry of every queued message.");

const origin = String(env.STAGING_WEB_ORIGIN || "http://localhost:3100").replace(/\/$/, "");
const api = `${origin}/api`;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} returned ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

const login = await request("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: env.ADMIN_EMAIL || "admin@nextgen.local", password: env.ADMIN_PASSWORD })
});
const headers = { Authorization: `Bearer ${login.accessToken}`, "Content-Type": "application/json" };
const programs = await request("/mentorship/programs", { headers });
const activePrograms = programs.filter((program) => program.status === "ACTIVE");
if (activePrograms.length !== 1) throw new Error(`Expected exactly one active mentorship program, found ${activePrograms.length}.`);
const result = await request(`/mentorship/programs/${activePrograms[0].id}/notifications/email-outbox/retry`, {
  method: "POST",
  headers,
  body: JSON.stringify({ recipients })
});
console.log(JSON.stringify({ program: activePrograms[0].name, recipients, ...result }, null, 2));
