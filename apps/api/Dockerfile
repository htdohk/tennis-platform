# ─── Builder ───────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN echo "registry=https://registry.npmmirror.com" > /root/.npmrc

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/shared-types/src/ packages/shared-types/src/
COPY packages/shared-utils/src/ packages/shared-utils/src/

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

COPY prisma/ prisma/
COPY prisma.config.ts ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/
COPY apps/api/src/ apps/api/src/

RUN pnpm install --frozen-lockfile
RUN npx prisma generate
RUN cd apps/api && npx nest build

# ─── Runner ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Copy entire application structure including node_modules
COPY --from=builder /app/ ./
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
