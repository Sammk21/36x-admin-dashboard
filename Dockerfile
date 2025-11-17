# ==========================================
# Stage 1: Dependencies (Production deps)
# ==========================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ONLY production dependencies
RUN rm -f package-lock.json && \
    npm install --omit=dev && \
    npm cache clean --force

# ==========================================
# Stage 2: Builder (Build with dev deps)
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all deps for building (dev + prod)
RUN rm -f package-lock.json && \
    npm install && \
    npm cache clean --force

# Copy source code
COPY . .

# Build Medusa v2
RUN npx medusa build

# ==========================================
# Stage 3: Runner (Final Production Image)
# ==========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache curl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 medusa

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9000

# Copy built Medusa output
COPY --from=builder --chown=medusa:nodejs /app/.medusa ./.medusa
COPY --from=builder --chown=medusa:nodejs /app/package.json ./package.json
COPY --from=builder --chown=medusa:nodejs /app/medusa-config.ts ./medusa-config.ts

# Copy production-only node_modules
COPY --from=deps --chown=medusa:nodejs /app/node_modules ./node_modules

USER medusa

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Use Medusa built server
WORKDIR /app/.medusa/server

# Final run command (no predeploy here)
CMD ["npm", "run", "start"]
