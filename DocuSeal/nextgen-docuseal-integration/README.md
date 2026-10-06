# NextGen DocuSeal Integration

This folder is a clean DocuSeal integration workspace for the **NextGen Empowerment Collaboration Hub**.

It is **not a separate full application**. The real platform still lives two folders up:

```text
../..
```

That main platform contains the runnable Next.js app, NestJS API, Prisma schema, PostgreSQL, Redis, and MinIO setup.

This folder contains:

- the NestJS document-signing module source bundle
- the frontend document-signing pages/components source bundle
- the Prisma migration SQL for document signing
- a local Docker Compose file for running the DocuSeal signing engine
- helper package scripts that call back into the main platform

## Folder Structure

```text
backend/
  documents-module/
    documents.module.ts
    documents.controller.ts
    documents.service.ts
    docuseal.service.ts
    docuseal-webhook.controller.ts
    dto/
  migration/
    migration.sql
  package.json
frontend/
  app-documents/
    page.tsx
    [id]/page.tsx
  beneficiary-portal-documents/
    page.tsx
  components/
    document-panel.tsx
  package.json
docker-compose.yml
.env.example
package.json
README.md
```

## What Runs Here

Only DocuSeal itself runs from this folder:

```bash
docker compose up -d
```

DocuSeal will be available at:

```text
http://localhost:3100
```

The NextGen app does **not** run from this folder. Run it from the main platform root.

## Main Platform Startup

From this folder, you can use helper scripts that point to the main platform:

```bash
pnpm platform:services
pnpm platform:generate
pnpm platform:migrate
pnpm platform:seed
pnpm platform:dev
```

Or open the main project root directly:

```bash
cd ../..
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Main app URLs:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000/api
```

## Environment Setup

Copy the example file:

```bash
copy .env.example .env
```

Add these values to the main platform `.env` as well:

```bash
DOCUSEAL_BASE_URL=http://localhost:3100
DOCUSEAL_API_KEY=
DOCUSEAL_WEBHOOK_SECRET=replace-with-a-local-webhook-secret
```

The API wrapper can run without DocuSeal credentials by creating local placeholder submissions. When you configure a real DocuSeal API key, the same service wrapper will call DocuSeal.

## Correct Integration Structure

The module files in this folder belong in the main platform like this:

```text
apps/api/src/modules/documents/
apps/api/prisma/migrations/0008_docuseal_document_signing/
apps/web/src/app/documents/
apps/web/src/app/beneficiary-portal/documents/
apps/web/src/components/documents/
```

The main platform also needs:

- `DocumentsModule` imported in `apps/api/src/app.module.ts`
- document models/enums in `apps/api/prisma/schema.prisma`
- document access rules in `apps/api/src/common/access/access.service.ts`
- document types in `apps/web/src/types/domain.ts`
- document permissions in `apps/web/src/lib/permissions.ts`
- a Documents navigation item in `apps/web/src/components/layout/app-shell.tsx`

Those integration points were already added to the main project during the DocuSeal phase.

## Approval Gate

Documents linked to approvals cannot be sent for signature until the related approval is:

```text
APPROVED
```

Blocked signing attempts are logged in the organization audit log.
