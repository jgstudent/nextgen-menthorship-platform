# VS Code and Docker development

## Open the independent repository

Open `C:\Users\junio\OneDrive\Documents\NextGen\Platform-App\nextgen-menthorship-platform` in VS Code (File → Open Folder). Use Docker Desktop with Linux containers. This retains the existing workflow: Node applications run in VS Code terminals; PostgreSQL, Redis, and SeaweedFS S3 storage run in Docker. No standalone mentorship website or second backend was created.

The source portal is not a runtime dependency. Do not use its `.env`, database URL, volumes, or DocuSeal credentials. GitHub origin remains `https://github.com/jgstudent/nextgen-menthorship-platform.git`; review changes before committing/pushing. No push has been performed by Phase 0.

## First setup

Use a normal PowerShell terminal in this repository. Node 24.15 was used for validation; pnpm is pinned to the existing 9.12.0 to preserve the lockfile.

```powershell
node scripts/setup-local.mjs
npx --yes pnpm@9.12.0 install --frozen-lockfile
docker compose up -d --wait
npx --yes pnpm@9.12.0 db:generate
npx --yes pnpm@9.12.0 --filter @nextgen/api exec prisma migrate deploy
npx --yes pnpm@9.12.0 db:seed
npx --yes pnpm@9.12.0 dev
```

The environment generator creates root `.env` for Compose, `apps/api/.env` for Nest/Prisma, and `apps/web/.env.local` for the frontend proxy. It generates new cryptographically random PostgreSQL/object-storage/admin passwords and JWT secret; all three files are ignored by Git. It refuses to overwrite any existing local environment file. The web file contains only API URLs, not database/admin secrets. Root and API environment files contain the same local infrastructure credentials and must be kept in sync if manually changed. Do not commit or paste their contents.

Open `http://localhost:3100`, sign in as `admin@nextgen.local`, and read its generated `ADMIN_PASSWORD` locally in `apps/api/.env` (copy the value inside the quotes, excluding the quotes). Navigate **Programs → Mentorship**. Setup creates no mentees, mentors, cohorts, or relationships. Re-running the seed does not delete records or change an existing admin password. Seed and reset explicitly load `apps/api/.env` before creating PrismaClient. Conflicting inherited DATABASE_URL/ADMIN_EMAIL/ADMIN_PASSWORD values stop the command rather than silently taking precedence. Seed verifies the saved password and active SUPER_ADMIN state; a mismatch fails with a recovery message. Investigate the target/configuration first. Reset is not a first-setup step. The explicit `db:reset-admin` command changes an existing admin only when intentionally invoked with a valid `ADMIN_PASSWORD`.

Run the installed migrations with `migrate deploy` on this new database. Do not use `migrate reset`. Phase 0 adds no new migration. Real local validation and remaining replacement-storage checks are recorded in [VALIDATION.md](VALIDATION.md).

## Service isolation

| Service | New local endpoint | Isolation |
| --- | --- | --- |
| Portal | `http://localhost:3100` | Different browser origin from the old port 3000, including localStorage auth. |
| Nest API | `http://localhost:4100/api` | Fresh JWT secret and new database URL. |
| PostgreSQL | `127.0.0.1:56478` | User/database `nextgen_mentorship`; own Compose volume. |
| Redis | `127.0.0.1:56379` | Own Compose volume; reserved for future shared services. |
| SeaweedFS S3 | `http://127.0.0.1:59000` | Fresh credentials, bucket `nextgen-mentorship-files`; container port 8333. |

Compose project name is `nextgen-mentorship`; volume names are prefixed with that project name. No external/shared volume or fixed container name is configured. Ports bind to loopback. Run only the root Compose file for this project; the supplemental DocuSeal folder is not part of this local stack.

## Object-storage replacement

MinIO's official repository is archived and says the community edition is unmaintained and source-only: https://github.com/minio/minio. The failed Docker Hub image is replaced by the maintained Apache-2.0 SeaweedFS project: https://github.com/seaweedfs/seaweedfs. Its documented single-process mini mode avoids adding separate storage services.

Compose pins official image chrislusf/seaweedfs:4.47 and registry digest sha256:ce9e796f1fe6f06968f4c04bdaf8f678dad9c8acdfef3d244133d71bfa6bf882 (public manifest verified September 20, 2026). It requires both S3 credentials, creates the configured bucket, disables WebDAV/admin UI, and health-checks /readyz with curl. Only S3 port 59000 is published to loopback; the old console port 59001 is no longer used. Existing MINIO_* API/environment names remain for compatibility with the current S3 signing client; do not regenerate your working credentials.

The new object-storage service uses a new object-storage-data volume. The unused minio-data declaration remains so no old data is repurposed or removed. PostgreSQL and Redis definitions are unchanged. Do not use down -v or --remove-orphans. The replacement does not migrate any prior MinIO objects.

Run docker compose up -d --wait, then docker compose ps. The object-storage service must show healthy. This replacement runtime still needs confirmation in the user's Docker terminal; the agent verified configuration and registry availability but cannot access the engine. Once healthy, verify storage through the existing API signing client:

```powershell
npx --yes pnpm@9.12.0 --filter @nextgen/api build
node --env-file=apps/api/.env scripts/check-storage.cjs
```

The smoke check requires Node 24, writes one small uniquely named object under phase0-validation/, verifies signed download content and anonymous denial, and retains the object. It never prints credentials or signed URLs. A PASS confirms client-level S3 compatibility; optionally exercise the existing Files UI too. No private environment output is needed.

## Daily commands

```powershell
docker compose up -d --wait
npx --yes pnpm@9.12.0 dev
```

Stop application terminals with Ctrl+C. `docker compose stop` stops this project's infrastructure without deleting its data. `.vscode/tasks.json` exposes environment, Docker, development, test, and build tasks through Terminal → Run Task. Extension recommendations are suggestions, not automatically installed extensions.

## Checks

```powershell
npx --yes pnpm@9.12.0 test
npx --yes pnpm@9.12.0 lint
npx --yes pnpm@9.12.0 typecheck
npx --yes pnpm@9.12.0 build
```

API tests exercise the actual JWT strategy and role guard over HTTP using mocked database records. Separate remediation validation deployed all 11 migrations into a new PostgreSQL schema and verified seeded login and protected access with real database records. The inherited frontend test command is a placeholder. Build and route/browser smoke checks are reported separately.

## Windows / OneDrive troubleshooting

The agent environment encountered `EPERM` resolving the OneDrive parent folder even after scoped access was granted. Source edits succeeded, so validation was run against a separate source copy under the task workspace. This does not prove Node fails in your normal VS Code terminal; try the commands above there first. If OneDrive file locking/permissions also block your terminal, use a separate normal local Git checkout outside OneDrive rather than moving/deleting the old portal.

The user confirmed Docker Desktop Linux engine, PostgreSQL, Redis, migrations, and the real portal work. An older temporary validation PostgreSQL container had occupied port 55432; the user stopped it. The agent still cannot access the engine named pipe; this is an agent restriction, not a diagnosis of the user’s Docker installation. No Docker permission changes or container/volume deletion were made.

## Production is a later decision

These are local development settings. Production hosting, HTTPS, secrets storage, backups, notification providers, student consent/retention, dependency review, and the authorization issues in [ARCHITECTURE_DISCOVERY.md](ARCHITECTURE_DISCOVERY.md) remain work to plan. Missing DocuSeal credentials retain existing placeholder behavior; they do not configure a live signing integration.

October 6, 2026: Windows expanded its dynamic exclusions through port 55586, blocking both prior PostgreSQL host ports. The host port is now 56478 (local bind probe passed); container port 5432, credentials and the database volume are unchanged. Restart API development terminals after this change. SeaweedFS image startup and the storage smoke check passed in the user's terminal.
