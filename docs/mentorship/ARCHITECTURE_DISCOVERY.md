# Architecture discovery — Mentorship Phase 0

## Evidence and provenance

**VERIFIED FROM CODE:** The destination started with only a README. With explicit user approval, 236 tracked working-tree files were imported from the existing NextGen Empowerment Collaboration Hub. Source HEAD: `5c81d842ac53dabe827fe5ef5d447a0e5588ed5d`. Source path: `C:\Users\junio\Documents\Codex\2026-05-16\you-are-a-senior-full-stack`. Its Git history, private environments, dependencies, generated TypeScript cache, and data volumes were excluded. The source application was not edited. The new repository retains its own Git history and origin.

Labels below distinguish **VERIFIED FROM CODE**, **ASSUMPTION**, and **RECOMMENDATION**. This is code discovery, not a production security audit. Validation results and limitations are in [VALIDATION.md](VALIDATION.md).

## 1. Current application stack

**VERIFIED FROM CODE:**

| Area | Implementation and evidence |
| --- | --- |
| Frontend / routing | Next.js 15, React 19, TypeScript; App Router in `apps/web/src/app`; client components for operational pages. Versions are pinned by `pnpm-lock.yaml`. |
| Backend / API | NestJS 10 on Node, Express adapter, REST controllers, `/api` global prefix; `apps/api/src/main.ts`, `app.module.ts`. |
| Database / data access | PostgreSQL; Prisma 5.22 client, schema, and 11 SQL migration directories in `apps/api/prisma`. |
| Client state | TanStack Query for remote data; React state/context for auth, theme, forms; `providers.tsx` and `auth-provider.tsx`. |
| Forms / validation | Controlled React inputs and native form validation; backend DTOs use class-validator/class-transformer with global whitelist, forbidden extra fields, and transformation. No dedicated React form library found in manifests. |
| UI / styling | Local UI primitives, lucide-react, Tailwind CSS, CSS custom properties, theme provider, clsx/tailwind-merge. TanStack Table and dnd-kit dependencies exist. |
| Logging | Nest runtime logging; Prisma `ActivityLog` and `OrganizationAuditLog`; service-specific audit writes. Auth audit errors are swallowed in `auth.service.ts`. No central structured telemetry pipeline found. |
| Tests | API Jest/ts-jest; imported test only checks AuthService construction. Web test command is a placeholder, not a test suite. Phase 0 adds HTTP authorization regression coverage. |
| Build | pnpm 9.12 workspace, Nest CLI, Next build, TypeScript; root and app `package.json` files. No replacement framework introduced. |
| Configuration | Nest ConfigModule reads API working-directory environment; Prisma reads API `.env`; Next reads web `.env.local`; Compose reads root `.env`. Setup now creates these separately. |
| Local infrastructure | Docker Compose PostgreSQL 16, Redis 7, MinIO; Redis has no implemented notification/worker consumer found. Apps run on the host for VS Code development. |
| Deployment | Imported Compose provides infrastructure only. No CI deployment workflow, application Dockerfile, or verified hosting target found. This phase supplies local development configuration, not production deployment. |

## 2. Repository structure

**VERIFIED FROM CODE:** `apps/api/src/modules` contains auth, users, organizations, workspaces, programs, beneficiaries, workshops, projects, boards, tasks, comments, files, meetings, approvals, documents, governance, dashboard, and now mentorship. Shared backend access helpers live under `common`. `apps/web/src` contains routes, reusable components, API/navigation/permission helpers, and domain types. `packages/config/typescript` contains shared compiler settings. `DocuSeal/nextgen-docuseal-integration` is a supplemental integration example outside the active pnpm workspace; the integrated runtime wrapper is already in `apps/api/src/modules/documents`.

## 3. Authentication architecture

**VERIFIED FROM CODE:** Login uses email/password, Argon2 password verification, account status/isActive checks, and a signed JWT containing user ID, email, and global role. Passport extracts bearer tokens and verifies expiry/signature. `JwtStrategy` reloads role and account status from the database on each authenticated request. Registration is explicitly forbidden; administrators create users. The frontend stores `nextgen_token` in localStorage, calls `/auth/me` through TanStack Query, and provides the result with `useAuth`. `api.ts` attaches the bearer token and Next rewrites proxy `/api` to Nest. Logout clears client state; it does not revoke issued JWTs. No refresh-token or token revocation mechanism is implemented.

## 4. Authorization architecture

**VERIFIED FROM CODE:** `@Roles`/`RolesGuard` perform global-role checks. `AccessService` builds record filters and assertions based on workspace membership, user assignments, beneficiary identity, sponsor visibility, and mentor assignments. SUPER_ADMIN and EXECUTIVE receive organization-wide access; many decisions depend on `User.role`, not membership role. Frontend navigation and `AppShell` also gate routes, but these do not secure APIs.

**Phase 0 boundary:** `/api/mentorship/foundation` reuses both JWT and role guards, allows only SUPER_ADMIN/EXECUTIVE, and returns static release metadata. `/programs/mentorship` uses the same role policy for navigation and rendering, including explicit handling before the generic `/programs` prefix matcher. No participant endpoint exists. No global mentor or mentee role was added.

## 5. User/account architecture

**VERIFIED FROM CODE:** `User` is the shared identity with one global `UserRole`: SUPER_ADMIN, EXECUTIVE, PROJECT_MANAGER, TEAM_MEMBER, VOLUNTEER, BENEFICIARY, SPONSOR_VIEWER. `WorkspaceMember` permits multiple workspaces, with one role per workspace. `UserProgramAssignment` permits multiple programs, unique by `(userId, programId)`, but its one role uses the global enum. `Beneficiary` is an optional one-to-one user profile and may exist without an account. `ProgramEnrollment` joins a beneficiary to multiple programs. Profile/security settings and administrative create/update/status/password/assignment APIs already exist. Multiple global roles and multiple roles within one program are not supported today.

## 6. Database architecture

**VERIFIED FROM CODE:** Reuse `Program` (workspace, owner, category, status, visibility, dates), `UserProgramAssignment`, `Beneficiary`, and `ProgramEnrollment`. Mentor associations already occur in `Beneficiary.assignedMentorId`, `ProgramEnrollment.assignedMentorId`, and `MentorAssignment`. The latter has optional beneficiary/program/workshop links, but no cohort, relationship status, or date range. No Cohort, relationship workspace, shared Resource, stipend, or notification table exists in the inspected schema. Existing general workspaces and task boards have wider operational access semantics than a private mentor/mentee workspace.

**RECOMMENDATION:** Do not add tables merely for an empty shell. Phase 0 preserves the schema and migration chain exactly. Design the migration from the three legacy mentor representations before adding authoritative relationships. Do not treat legacy assignments as consent, eligibility, or validated matches.

## 7. Relevant existing components

**VERIFIED FROM CODE:** `AppShell`, `SidebarSection`, `PageHeader`, `AccessDenied`, Card/Button/Input/Select/Dialog primitives, toasts, theme handling, avatar, file attachments, task table, Kanban, meeting management, and document panels exist. Existing routes cover dashboard, programs, beneficiary portal, profile/security/settings, users, operations, governance, sponsor views, and reports. Reports and invitation/password-recovery capabilities contain placeholders; route presence is not proof of completed functionality.

## 8. Relevant APIs/services

**VERIFIED FROM CODE:** Reuse `/auth/*`, `/programs`, `/beneficiaries`, `/users` (including assignment operations), `/workshops`, `/meetings`, `/tasks`, `/files`, `/documents`, `/approvals`, `/dashboard`, and the shared AccessService/PrismaService. MinIO stores uploaded files; DocuSeal has an existing wrapper and webhook. Missing DocuSeal settings enable placeholder signing behavior in the legacy implementation. No implemented shared notification delivery or approved resource catalog was found. See `docs/API.md` for the imported API inventory; endpoint code is authoritative.

## 9. Reuse strategy

**RECOMMENDATION:** Keep the modular Nest monolith and the Next app. Keep one identity within this new portal, independent of the older running app. Build future business rules in Nest services, DTOs, and access policies so a mobile app can use the same REST API. Reuse visual components immediately; reuse task/meeting/resource internals only after establishing relationship-level and field-level authorization. Program visibility must never imply permission to read student records.

## 10. Technical constraints

**VERIFIED FROM CODE:** Global role assumptions are embedded in navigation and access predicates. Program assignments and enrollments encode different kinds of participation. Users are not directly scoped to an organization, and organization-wide roles are not tenant-safe isolation. Cohort-specific coordinator scope does not yet exist. The seed script originally deleted broad categories of records and reset a fixed admin password; the imported copy was changed to non-deleting bootstrap with an explicit password and no update of an existing admin. Inactive beneficiary accounts now receive random unusable passwords instead of a shared default.

**ASSUMPTION:** This app serves one NextGen organization during the initial pilot; multi-tenant operation is not established by the current schema. College eligibility, consent/retention rules, whether dual roles are allowed within one cohort, and how legacy data should migrate require program-owner decisions.

## 11. Security observations relevant to mentorship

**VERIFIED FROM CODE — unresolved inherited concerns:**

- `ProgramsService.programInclude` loads all enrollments and full beneficiary records for non-sponsor callers. An enrolled beneficiary can therefore receive other beneficiaries' information in an accessible program. Do not use that response for mentorship participant screens; field projections and enrollment filtering need a focused fix before student rollout.
- `AccessService.beneficiaryWhere` grants PROJECT_MANAGER access to every beneficiary. This is broader than the future authorized-cohort requirement.
- Beneficiary and enrollment `notes` have no audience/visibility classification. Do not store private mentor or administrative notes there for a future shared workspace.
- JWTs in localStorage are exposed to successful XSS; logout/password changes do not revoke tokens. Login limiting is process-local and keyed by email; it is not shared infrastructure protection.
- Auth audit failures are discarded. Retention, consent, sensitive-data logging policy, and reliable administrative audit requirements are not defined.
- DocuSeal mock behavior and existing deployment settings must be reviewed before production use. Dependency vulnerability review is not a completed security audit.

**VERIFIED FROM CODE — preserved controls:** Argon2 hashes, account-state checks, JWT verification/current-role refresh, role guards, scoped access helpers, DTO validation, Helmet, configured CORS, and public-user selects remain. The new endpoint has no database reads of mentorship information, no mutation, and no resource identifiers to enumerate.

**RECOMMENDATION:** Fail closed at every future mentorship endpoint. Enforce program/cohort/relationship and audience rules server-side, with negative tests for other students, unassigned mentors, wrong cohorts, archived programs, and revoked membership. Fix the inherited exposure paths before real student data or Phase 1 enrollment is enabled.

## 12. Recommended integration approach

1. Keep the new administrative shell and existing portal services; no new schema is needed in Phase 0.
2. Resolve program membership roles and legacy-data mapping, with explicit migration constraints and an authorization matrix.
3. Close the identified program/beneficiary exposure paths before participant enrollment.
4. Add enrollment/profiles incrementally, then cohorts and validated mentor/mentee relationships.
5. Introduce relationship workspaces and shared resource assignments only with explicit least-privilege policies.

**Local independence:** Compose uses project `nextgen-mentorship`, project-owned volumes, database `nextgen_mentorship`, loopback-only ports 55432/56379/59000/59001, frontend 3100, and API 4100. `scripts/setup-local.mjs` generates fresh ignored secrets and leaves external integrations blank. No previous database, volume, credentials, or external signing service is copied or connected. Running Docker and database verification may still require the user's normal Windows session; see validation.
