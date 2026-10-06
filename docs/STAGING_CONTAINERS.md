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

Terminate TLS with a reverse proxy on the VM. Only the web entry point should be public. Keep the API, database, Redis, and object storage protected by the VM firewall and Docker networks.
