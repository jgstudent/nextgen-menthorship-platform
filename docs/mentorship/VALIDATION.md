# Phase 0 validation

> Historical Phase 0 evidence is retained below. The current frozen staging snapshot and its newer validation results are recorded in [v0.1.0-staging.1](../releases/v0.1.0-staging.1.md).

Updated September 20, 2026. The authoritative repository is the independent OneDrive NextGen repository. The old/source application was not modified or started; its Git working tree remains clean.

## Real local validation reported by the user

The user successfully generated private environment files, installed with pnpm 9.12.0 --frozen-lockfile, ran Docker Desktop Linux engine, started healthy PostgreSQL and Redis, generated Prisma Client, and deployed all 11 migrations to the fresh nextgen_mentorship database. Seed created the admin and organization. Nest mapped routes and Next served localhost:3100. Login succeeded after intentional reset-admin recovery. Programs → Mentorship rendered inside the existing hub with Goals, Tasks, Sessions, Resources, Progress and enrollment/matching closed. Existing Programs remained functional. These are real local results, replacing the earlier blanket runtime-unverified status.

## Remediation checks performed by the agent

| Check | Result |
| --- | --- |
| Root/API private config comparison | Admin passwords and database URLs match; no inherited admin/database override present in this agent process. Values were not printed. |
| Existing PostgreSQL account | Read-only check: present and current password verifies with Argon2. Working account was not reset or modified. |
| Fresh setup | Actual setup-local generator ran in an isolated scratch folder; its fresh admin password was retained, with only database connection redirected to a new validation schema on the same local development database. |
| Migrations | All 11 deployed successfully into new isolated schemas, without reset, DROP, deletion, or changes to public application tables. |
| Seed and first login | PASS: generated password verifies; actual Nest HTTP login using Prisma-backed records returns 201/SUPER_ADMIN without reset-admin. |
| Repeat and conflicting seed | PASS: repeated seed preserves stored hash; different configured password fails clearly and leaves stored hash unchanged. |
| Protected route with real database | SUPER_ADMIN returns 200 and only Phase 0 metadata; anonymous request returns 401. |
| pnpm -r test | PASS: 3 API suites, 21 tests. Frontend command remains an echo placeholder. |
| pnpm -r typecheck | PASS: both applications. |
| pnpm -r build | PASS: Nest and Next; /programs/mentorship remains in production routes. |
| pnpm -r lint | PASS: zero errors, four pre-existing frontend warnings. |
| Explicit lint of changed Prisma scripts and bootstrap test | PASS, zero warnings/errors. |
| docker compose config --quiet | PASS using existing private environment. No rendered credentials printed. |
| Official SeaweedFS image | Docker Registry manifest returned HTTP 200 for 4.47; image pinned to returned SHA-256 digest. Source confirms mini flags, curl in image, and S3 /readyz endpoint. |
| docker compose up -d --wait | BLOCKED for agent by named-pipe permission denial; replacement container health and upload/download still require user terminal verification. |

Validation used Node 24.15.0 and pnpm 9.12.0 with existing dependencies in work/phase0-validation because agent Node resolution under OneDrive is restricted. Changed source files were mirrored for tests. No dependency upgrades or lockfile edits were made during remediation. TSX's CLI failed in this sandbox at os.userInfo with uv_os_get_passwd ENOMEM. Fresh database validation therefore executed the successfully built seed JavaScript with Node --env-file=.env. This proves seed/hash/login behavior; it does not claim the exact TSX db:seed launcher was revalidated here. The explicit environment loader also has unit coverage.

Three isolated schemas were added and deliberately retained (no destructive cleanup): phase0_validation_1789941824104 and phase0_validation_1789941901354 contain migration results from attempts stopped by the TSX launcher; phase0_validation_1789941936135 contains the successful seed/login validation records. None is the application's public schema. The uncommitted reproduction harness is work/validate-fresh.cjs in the Codex task workspace; it contains no hard-coded credentials.

## Security coverage and preserved scope

The 17 existing HTTP boundary tests exercise actual Nest JWT strategy and guards with mocked Prisma records: anonymous/forged/expired tokens, admin/executive allowance, five other role denials, inactive/suspended/deleted accounts, login/me/logout and disabled registration. Three new bootstrap tests check exact quoted environment parsing, inherited credential conflict detection without disclosure, Argon2 verification and inactive-account rejection. The original AuthService construction test remains.

No Prisma schema/migration, mentorship route, application UI, operational module, dependency version, PostgreSQL service or Redis service was changed in remediation. No Phase 1 functionality, push, deployment, volume deletion or source-app modification occurred.

## Remaining limitations

Four unchanged warnings: unused approvals roleLabel; AuthProvider memo dependencies; two plain image optimization warnings. Frontend has no automated UI suite. Earlier browser checks covered admin navigation/refresh/logout and project-manager denial with synthetic records; user subsequently verified real admin login and the shell. Every operational workflow, storage upload/download, mobile/light layouts and production deployment have not been comprehensively tested.

The original failed password hash was replaced by reset-admin before this investigation. Current environment parity and successful clean-schema login cannot prove which environment or database produced that earlier hash. Silent preservation of mismatched existing credentials is a confirmed code defect and now fails explicitly; the historical initial failure's precise trigger remains unproven.

Phase 0 final acceptance remains conditional on replacement container startup/health and S3 upload/download verification in the user's Docker environment, plus one normal-terminal fresh seed path if exact launcher confirmation is required. Follow LOCAL_DEVELOPMENT.md; do not reset/delete the working database to repeat a fresh test.

The added scripts/check-storage.cjs passed Node syntax validation. Runtime awaits the user's object-storage service. It tests the existing compiled S3 client without changing application code, retains one small test object, and suppresses credentials/signed URLs.

## October 3 runtime follow-up

User evidence confirms the pinned SeaweedFS image pulled and started, API build passed, and check-storage.cjs passed signed upload/download and anonymous denial. Windows later expanded its excluded TCP range through 55586, preventing Docker from publishing port 55478. A local bind probe passed for replacement host port 56478. Compose, setup defaults, and example configuration now use 56478; database credentials, container port 5432 and volumes are preserved. PostgreSQL restart and API reconnection after the port change remain pending user-terminal verification.
