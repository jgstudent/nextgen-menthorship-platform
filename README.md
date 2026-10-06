# NextGen Mentorship Platform

An independent copy of the NextGen Haitian Empowerment Portal, with mentorship integrated into the existing Next.js / NestJS / Prisma architecture.

## Start here

- [VS Code and Docker development](docs/mentorship/LOCAL_DEVELOPMENT.md)
- [Mentorship technical home and roadmap](docs/mentorship/README.md)
- [Verified architecture discovery](docs/mentorship/ARCHITECTURE_DISCOVERY.md)
- [Validation results and limitations](docs/mentorship/VALIDATION.md)
- [Phase 0 completion and file inventory](docs/mentorship/COMPLETION_REPORT.md)
- [Isolated staging containers](docs/STAGING_CONTAINERS.md)

## Current scope

The imported portal includes authentication, dashboard, organizations, workspaces, programs, beneficiaries, workshops, projects, boards, tasks, meetings, files, documents, approvals, governance, user administration, and profile/settings routes. Some legacy surfaces remain placeholders; see the architecture report.

The current staging release includes program and cohort configuration, public and administrative applications, approvals, matching, formal relationships, goals, sessions, attendance, participant self-service, monitoring and exportable reports, a shared Resource Center, verified service hours, and explicit stipend decisions. Mentorship remains an optional per-organization add-on.

The frozen release is `v0.1.0-staging.1`. See [its release record](docs/releases/v0.1.0-staging.1.md) for scope and verification. Container deployment work continues in later commits so the frozen tag remains immutable.

## Independent local development

Use Node.js, pnpm 9.12.0, Docker Desktop with Linux containers, and VS Code. Run commands in this repository, not the previous portal directory.

```powershell
node scripts/setup-local.mjs
npx --yes pnpm@9.12.0 install --frozen-lockfile
docker compose up -d --wait
npx --yes pnpm@9.12.0 db:generate
npx --yes pnpm@9.12.0 --filter @nextgen/api exec prisma migrate deploy
npx --yes pnpm@9.12.0 db:seed
npx --yes pnpm@9.12.0 dev
```

Web: http://localhost:3100. API: http://localhost:4100/api.

Sign in as `admin@nextgen.local`, using the generated `ADMIN_PASSWORD` in your ignored `apps/api/.env`. Setup refuses to overwrite existing environment files. Do not copy credentials or database contents from the previous portal. The seed creates only a baseline organization, workspaces, and admin, and preserves an existing admin account; it does not populate mentorship.

Docker uses project `nextgen-mentorship` and its own volumes, PostgreSQL database, credentials, and host ports. Applications run locally for editing/debugging; infrastructure runs in Docker. Nothing is deployed or pushed automatically.

## Checks

```powershell
npx --yes pnpm@9.12.0 test
npx --yes pnpm@9.12.0 lint
npx --yes pnpm@9.12.0 typecheck
npx --yes pnpm@9.12.0 build
```

The web test script inherited from the portal is a placeholder; it is not a passing UI suite. See the validation report for actual API tests and manual browser checks.

## Repository layout

- `apps/api`: Nest modules, access policies, Prisma schema/migrations, API tests.
- `apps/web`: Next App Router pages, portal UI primitives, auth context, API client.
- `packages/config`: shared TypeScript configuration.
- `docs/mentorship`: architecture, roadmap, setup, validation, completion report.
- `scripts/setup-local.mjs`: generates fresh local configuration without printing secrets.
- `.vscode`: recommended extensions and development tasks.
- `DocuSeal/nextgen-docuseal-integration`: legacy supplemental reference only. Do not launch its separate Compose file for this app; the active wrapper is already under `apps/api/src/modules/documents` and its external credentials are blank by default.

## Before student rollout

This is a staging candidate, not a production deployment. Apply all migrations through `0022_mentorship_verified_service_hours` with `pnpm db:deploy`, complete the container smoke test, and finish the security, backup/restore, and end-to-end acceptance gates described in the release record before real participant use.
