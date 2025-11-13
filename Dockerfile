# Multi-stage Dockerfile for Medusa v2

# Stage 1: Build stage
FROM node:20-alpine3.20 AS builder

# Update and upgrade packages to patch vulnerabilities
RUN apk update && apk upgrade --no-cache

# Install necessary build tools
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine3.20 AS runner

# Update and upgrade packages to patch vulnerabilities
RUN apk update && apk upgrade --no-cache

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=medusa:medusa /app/dist ./dist
COPY --from=builder --chown=medusa:medusa /app/medusa-config.ts ./
COPY --from=builder --chown=medusa:medusa /app/.medusa ./.medusa

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
