# ─── Builder ───────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN echo "registry=https://registry.npmmirror.com" > /root/.npmrc

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/mcp-server/package.json apps/mcp-server/tsconfig.json apps/mcp-server/

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
RUN pnpm install --frozen-lockfile

COPY apps/mcp-server/src/ apps/mcp-server/src/
RUN cd apps/mcp-server && npx tsc

# ─── Runner ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/ ./

ENV NODE_ENV=production

CMD ["node", "apps/mcp-server/dist/index.js"]
