# Production Dockerfile for Backend
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init curl
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --frozen-lockfile --only=production

# Builder stage
FROM base AS builder
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --frozen-lockfile

COPY apps/backend ./apps/backend
COPY packages ./packages

# Build packages and application
RUN npm run build --workspace=@board3/types
RUN npm run build --workspace=@board3/shared
RUN npm run build --workspace=backend

# Runtime stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy runtime dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/

# Copy necessary files
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs turbo.json ./

USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]