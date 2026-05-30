# ─── Builder ───────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN echo "registry=https://registry.npmmirror.com" > /root/.npmrc && \
    echo "node-linker=hoisted" >> /root/.npmrc

ARG NEXT_PUBLIC_API_BASE_URL=http://api:3000
ARG NEXT_PUBLIC_BRAND_NAME=测试网球馆

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/shared-types/src/ packages/shared-types/src/
COPY packages/shared-utils/src/ packages/shared-utils/

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
RUN pnpm install --frozen-lockfile --filter @tennis/web-admin

COPY apps/web-admin/package.json apps/web-admin/tsconfig.json apps/web-admin/next.config.ts apps/web-admin/postcss.config.mjs apps/web-admin/components.json apps/web-admin/
COPY apps/web-admin/app/ apps/web-admin/app/
COPY apps/web-admin/components/ apps/web-admin/components/
COPY apps/web-admin/lib/ apps/web-admin/lib/
COPY apps/web-admin/public/ apps/web-admin/public/

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME

RUN pnpm --filter @tennis/web-admin build

# ─── Runner ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/web-admin/.next/standalone/ ./
COPY --from=builder /app/apps/web-admin/.next/static/ ./apps/web-admin/.next/static/
COPY --from=builder /app/apps/web-admin/public/ ./apps/web-admin/public/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/web-admin/server.js"]
