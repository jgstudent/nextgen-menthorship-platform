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

const origin = String(env.STAGING_WEB_ORIGIN || "http://localhost:3100").replace(/\/$/, "");
const api = `${origin}/api`;
const password = env.ADMIN_PASSWORD;
if (!password) throw new Error("ADMIN_PASSWORD is missing from .env.staging.");

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} returned ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function login(email) {
  const result = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!result.accessToken) throw new Error(`No access token returned for ${email}.`);
  return result.accessToken;
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }
function assert(condition, message) { if (!condition) throw new Error(message); }

const health = await request("/health");
assert(health.status === "ok", "API health check did not return ok.");
const adminToken = await login(env.ADMIN_EMAIL || "admin@nextgen.local");
const programs = await request("/mentorship/programs", { headers: auth(adminToken) });
const program = programs.find((item) => item.code === "PILYE-QA");
assert(program, "PILYE-QA seed program was not found.");
const adminRelationships = await request(`/mentorship/programs/${program.id}/relationships`, { headers: auth(adminToken) });
assert(adminRelationships.length === 2, "Expected exactly two QA classrooms.");
assert(new Set(adminRelationships.map((item) => item.provider.role)).size === 2, "Expected separate mentor and tutor classrooms.");
assert(adminRelationships.every((item) => item.assignments.length && item.notes.some((note) => note.visibility === "STAFF_ONLY")), "Educator Console is missing seeded assignments or staff-only notes.");

const menteeToken = await login("mentee.qa@pilye.local");
const menteePortal = await request("/mentorship/portal", { headers: auth(menteeToken) });
const mentee = menteePortal.participants.find((item) => item.role === "MENTEE");
assert(mentee?.relationships.length === 2, "Mentee does not see both classrooms.");
assert(new Set(mentee.relationships.map((item) => item.counterpart.role)).size === 2, "Mentee classrooms are not separated by mentor and tutor role.");
assert(mentee.relationships.every((item) => item.goals.length && item.sessions.length >= 2 && item.resourceAssignments.length && item.assignments.length && item.notes.length), "A mentee classroom is missing goals, sessions, resources, assignments, or shared notes.");
assert(mentee.relationships.flatMap((item) => item.notes).every((note) => note.visibility === "SHARED"), "A staff-only note leaked into the participant portal.");

for (const email of ["mentor.qa@pilye.local", "tutor.qa@pilye.local"]) {
  const token = await login(email);
  const portal = await request("/mentorship/portal", { headers: auth(token) });
  const provider = portal.participants.find((item) => item.relationships.length === 1);
  assert(provider, `${email} does not have exactly one scoped classroom.`);
  assert(provider.relationships[0].resourceAssignments.length === 1, `${email} cannot see the resource assigned in their classroom.`);
}

const report = await request(`/mentorship/programs/${program.id}/monitoring`, { headers: auth(adminToken) });
assert(report.summary.relationships === 2, "Monitoring report relationship total is incorrect.");
assert(report.summary.totalResources === 2, "Monitoring report resource total is incorrect.");
assert(report.summary.totalAssignments === 2, "Monitoring report assignment total is incorrect.");
assert(report.summary.completedHours === 2, "Verified service-hour total is incorrect.");

console.log(JSON.stringify({
  status: "PASS",
  checks: [
    "API health",
    "Super Admin access",
    "separate mentor and tutor classrooms",
    "participant note privacy",
    "goals, sessions, assignments, and resources",
    "provider classroom isolation and shared resource visibility",
    "verified hours and monitoring report"
  ]
}, null, 2));
