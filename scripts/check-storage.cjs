// Run after building the API: node --env-file=apps/api/.env scripts/check-storage.cjs
// Retains one small validation object; never deletes existing data.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { randomBytes } = require("node:crypto");
const assert = require("node:assert/strict");

async function main() {
  const values = process.env;
  assert.equal(values.MINIO_ENDPOINT, "127.0.0.1");
  assert.equal(values.MINIO_PORT, "59000");
  assert.equal(values.MINIO_BUCKET, "nextgen-mentorship-files");
  assert(values.MINIO_ACCESS_KEY && values.MINIO_SECRET_KEY);
  const localRequire = createRequire(resolve(__dirname, "../apps/api/package.json"));
  localRequire("reflect-metadata");
  const { MinioStorageService } = localRequire("./dist/src/modules/files/minio-storage.service.js");
  const storage = new MinioStorageService({ get: (key) => values[key] });
  const bucket = values.MINIO_BUCKET;
  const key = `phase0-validation/${Date.now()}-${randomBytes(8).toString("hex")}.txt`;
  const payload = Buffer.from("NextGen Phase 0 local object-storage validation\n");
  const health = await fetch("http://127.0.0.1:59000/readyz", { signal: AbortSignal.timeout(10000) });
  assert.equal(health.status, 200);
  await storage.ensureBucket(bucket);
  await storage.putObject(bucket, key, payload, "text/plain", { purpose: "phase0-validation" });
  const signed = storage.presignedGetObject(bucket, key, 60);
  const download = await fetch(signed, { signal: AbortSignal.timeout(10000) });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), payload.toString());
  const anonymous = await fetch(signed.split("?")[0], { signal: AbortSignal.timeout(10000) });
  assert.equal(anonymous.status, 403);
  console.log("PASS: S3 ready; existing API client uploaded and downloaded matching content; anonymous access denied.");
  console.log("One small object retained under phase0-validation/; no existing data removed.");
}

const timeout = setTimeout(() => {
  console.error("Storage validation timed out. Check object-storage health and local configuration.");
  process.exit(1);
}, 45000);
main().catch(() => {
  console.error("Storage validation failed. Confirm the API is built, object-storage is healthy, and root/API storage settings match. Details suppressed to protect signed URLs and credentials.");
  process.exitCode = 1;
}).finally(() => clearTimeout(timeout));
