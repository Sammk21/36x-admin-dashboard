# Multi-stage Dockerfile for Medusa v2

# Stage 1: Build stage
# Using Node 22 LTS (latest) for better security patches
FROM node:22-alpine AS builder

# Update packages and install necessary build tools
RUN apk update && \
    apk upgrade && \
    apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

# Install dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Build the application (generates .medusa directory)
RUN npx medusa build

# Stage 2: Production stage
# Using Node 22 LTS (latest) for better security patches
FROM node:22-slim AS runner

# Install security updates and dumb-init
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a non-root user
RUN groupadd -g 1001 medusa && \
    useradd -u 1001 -r -g medusa -s /usr/sbin/nologin medusa

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=medusa:medusa /app/.medusa ./.medusa
COPY --from=builder --chown=medusa:medusa /app/medusa-config.ts ./

# Copy necessary files
COPY --chown=medusa:medusa instrumentation.ts ./
COPY --chown=medusa:medusa tsconfig.json ./
COPY --chown=medusa:medusa src ./src

# Set user
USER medusa

# Expose port (Medusa default is 9000)
EXPOSE 9000

# Set environment to production
ENV NODE_ENV=production

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the server
CMD ["sh", "-c", "npx medusa db:migrate && npm run start"]
