# ============================================================
# BuildMart API — Dockerfile
# Multi-stage: deps → build → production
# Based on Node 20 Alpine for minimal image size.
# ============================================================

# ── Stage 1: Base ─────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9
WORKDIR /app

# ── Stage 2: Install all dependencies ─────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 3: Build ────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source
COPY packages/database ./packages/database
COPY apps/api ./apps/api
COPY turbo.json ./

# Generate Prisma client
RUN cd packages/database && pnpm db:generate

# Build NestJS
RUN cd apps/api && pnpm build

# ── Stage 4: Production image ─────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl dumb-init
RUN npm install -g pnpm@9

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
USER nestjs

# Copy only what's needed to run
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production

# Use dumb-init to handle PID 1 / signal forwarding correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
