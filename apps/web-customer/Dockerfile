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
RUN pnpm install --frozen-lockfile --filter @tennis/web-customer

COPY apps/web-customer/package.json apps/web-customer/tsconfig.json apps/web-customer/next.config.ts apps/web-customer/postcss.config.mjs apps/web-customer/
COPY apps/web-customer/app/ apps/web-customer/app/
COPY apps/web-customer/components/ apps/web-customer/components/
COPY apps/web-customer/lib/ apps/web-customer/lib/
COPY apps/web-customer/public/ apps/web-customer/public/

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME

RUN pnpm --filter @tennis/web-customer build

# ─── Runner ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/web-customer/.next/standalone/ ./
COPY --from=builder /app/apps/web-customer/.next/static/ ./apps/web-customer/.next/static/
COPY --from=builder /app/apps/web-customer/public/ ./apps/web-customer/public/

ENV NODE_ENV=production
EXPOSE 3003

CMD ["node", "apps/web-customer/server.js"]
