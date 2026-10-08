# Staging containers

This stack packages the independent mentorship application. It does not deploy or modify the original NextGen live portal.

## Services

- `web`: public Next.js interface on port 3100
- `api`: NestJS API, bound to the host loopback interface on port 4100
- `migrate`: one-time Prisma migration job that must succeed before the API starts
- `bootstrap`: idempotent initial organization and administrator setup
- `postgres`: private PostgreSQL database with persistent storage
- `redis`: private Redis service with persistent storage
- `object-storage`: private application storage, with its data endpoint bound to host loopback

PostgreSQL, Redis, and the API-to-storage network are not exposed publicly. Browser API calls use the web service's same-origin `/api` proxy.

## First local staging launch

From the repository root:

```powershell
npx --yes pnpm@9.12.0 staging:env
npx --yes pnpm@9.12.0 staging:config
npx --yes pnpm@9.12.0 staging:up
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

Open `http://localhost:3100`. The generated administrator password is stored only in `.env.staging`.

For an isolated acceptance-test dataset after the stack is healthy:

```powershell
npm run staging:seed-qa
npm run staging:verify
```

The QA seed is idempotent and creates one mentee with separate mentor and tutor classrooms. It uses three `*.qa@pilye.local` staging-only accounts and the staging `ADMIN_PASSWORD`; it must never be run against production. Verification checks classroom isolation, participant-note privacy, goals, sessions, assignments, resources, verified hours, and monitoring totals without printing credentials.

To watch startup logs:

```powershell
npx --yes pnpm@9.12.0 staging:logs
```

To stop the stack without deleting its data:

```powershell
npx --yes pnpm@9.12.0 staging:down
```

Do not add `-v` to the shutdown command unless permanent deletion of the staging database and stored files is intended.

## VM deployment values

Before launching on a VM, edit `.env.staging`:

- set `STAGING_WEB_ORIGIN` to the public HTTPS origin;
- set `STAGING_PUBLIC_HOST` to the storage hostname used by browsers;
- set `STAGING_PUBLIC_USE_SSL=true` after TLS is configured;
- replace the default administrator email if required;
- configure email and DocuSeal values only when those integrations are ready.

## Participant account invitations

Approving an eligible applicant now links the application to an existing account with the same email address, or creates an invited account and queues a single-use activation link. New-account links expire after seven days and let the participant create their password at `/activate/<token>`.

For Resend, set `RESEND_API_KEY` and a verified sender such as `EMAIL_FROM="Pilye <no-reply@nextgenhaitian.org>"`. Set `EMAIL_REPLY_TO` only when a monitored reply address is available. The older provider-neutral `EMAIL_DELIVERY_URL` and `EMAIL_DELIVERY_TOKEN` integration remains supported as a fallback. Without either provider, invitations remain safely queued and the outbox records the configuration error.

After configuring Resend, retry only the intended acceptance-test recipients:

```bash
npm run staging:email:retry -- recipient1@example.org recipient2@example.org
```

The command refuses to run without an explicit recipient list. The API restricts retries to Super Admins, caps each attempt at 100 pending messages, uses a stable provider idempotency key, and audits the result. Future Potay sign-in can replace the password activation step without changing the application-to-account linkage.

Archiving a program preserves its records. Permanent deletion is limited to Super Admins, requires the exact program-code confirmation, and cascades through all program-owned mentorship records. Shared Pilye/Potay identity accounts are intentionally preserved because they may belong to other products or programs.

Terminate TLS with a reverse proxy on the VM. Only the web entry point should be public. Keep the API, database, Redis, and object storage protected by the VM firewall and Docker networks.
