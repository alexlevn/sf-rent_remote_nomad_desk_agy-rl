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
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
WORKDIR /app/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3288
ENV HOSTNAME="0.0.0.0"

# Create uploads directory and grant ownership to node user
RUN mkdir -p /app/web/.data/uploads && chown -R node:node /app/web

# Copy files from builder stage
COPY --from=builder --chown=node:node /app/web ./

USER node

EXPOSE 3288

CMD ["npm", "start"]
