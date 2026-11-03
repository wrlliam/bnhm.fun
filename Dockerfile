# syntax=docker/dockerfile:1
# Production image: build with Bun, run Next's standalone server on slim Node.

ARG BUN_VERSION=1.3
ARG NODE_VERSION=22

# ---- deps: install with bun using the lockfile ----
FROM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---- build: produce the standalone Next.js server ----
FROM oven/bun:${BUN_VERSION}-alpine AS build
WORKDIR /app
# public URL for share previews; baked in at build time
ARG NEXT_PUBLIC_SITE_URL=https://bnhm.fun
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- run: minimal image with just the standalone output ----
FROM node:${NODE_VERSION}-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
# node handles SIGTERM for a clean shutdown (open live connections are closed)
STOPSIGNAL SIGTERM
CMD ["node", "server.js"]
