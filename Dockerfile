# Multi-stage Dockerfile for Medusa v2
# Optimized for production deployment on Dokploy

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install ALL dependencies (including dev) with legacy peer deps
RUN npm ci --legacy-peer-deps

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install runtime dependencies needed for build
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Build the Medusa application
# This generates the .medusa directory with compiled backend and admin
RUN npx medusa build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install production runtime dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 medusa && \
    useradd -u 1001 -r -g medusa -s /usr/sbin/nologin medusa

# Copy package files
COPY --chown=medusa:medusa package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=medusa:medusa /app/.medusa ./.medusa
COPY --from=builder --chown=medusa:medusa /app/medusa-config.ts ./medusa-config.ts

# Copy source files (needed for modules and runtime)
COPY --chown=medusa:medusa src ./src
COPY --chown=medusa:medusa instrumentation.ts ./instrumentation.ts
COPY --chown=medusa:medusa tsconfig.json ./tsconfig.json

# Switch to non-root user
USER medusa

# Set environment
ENV NODE_ENV=production
ENV PORT=9000

# Expose Medusa port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run database migrations and start server
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
