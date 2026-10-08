FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/typescript/base.json packages/config/typescript/base.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @nextgen/api prisma:generate \
  && pnpm --filter @nextgen/api build
RUN mkdir -p /app/prisma-engines \
  && query_engine="$(find /root/.cache/prisma /app/node_modules -type f -name 'libquery_engine-debian-openssl-3.0.x.so.node' -print -quit)" \
  && schema_engine="$(find /root/.cache/prisma /app/node_modules -type f -name 'schema-engine-debian-openssl-3.0.x' -print -quit)" \
  && test -n "$query_engine" \
  && test -n "$schema_engine" \
  && cp "$query_engine" /app/prisma-engines/libquery_engine.so.node \
  && cp "$schema_engine" /app/prisma-engines/schema-engine \
  && chmod 755 /app/prisma-engines/schema-engine \
  && chmod 644 /app/prisma-engines/libquery_engine.so.node

FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /root/.cache/prisma /home/node/.cache/prisma
COPY --from=build --chown=node:node /app/prisma-engines ./prisma-engines
USER node
EXPOSE 4100
CMD ["node", "apps/api/dist/src/main.js"]
