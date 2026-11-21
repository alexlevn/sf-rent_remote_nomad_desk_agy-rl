# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Next.js 16 (NomadDesk)

# Stage 1: Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app/web

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app/web
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Builder
FROM base AS builder
WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY next.config.ts tsconfig.json postcss.config.mjs drizzle.config.ts ./
COPY app ./app
COPY components ./components
COPY content ./content
COPY context ./context
COPY drizzle ./drizzle
COPY features ./features
COPY lib ./lib
COPY public ./public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
WORKDIR /app/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3288
ENV HOSTNAME="0.0.0.0"

# Create uploads and seed directories and grant ownership to node user
RUN mkdir -p /app/web/.data/uploads /app/docs/seed && chown -R node:node /app/web /app/docs

# Copy runtime artifacts, migration/seed sources, and seed JSON files
COPY --from=builder --chown=node:node /app/web/package.json /app/web/package-lock.json* ./
COPY --from=builder --chown=node:node /app/web/next.config.ts /app/web/tsconfig.json /app/web/drizzle.config.ts ./
COPY --from=builder --chown=node:node /app/web/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/web/.next ./.next
COPY --from=builder --chown=node:node /app/web/public ./public
COPY --from=builder --chown=node:node /app/web/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/web/lib ./lib
COPY --from=builder --chown=node:node /app/web/content ./content
COPY --from=seed --chown=node:node . /app/docs/seed

USER node

EXPOSE 3288

CMD ["npm", "start"]
