# Production Dockerfile for Frontend
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init curl
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY turbo.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --frozen-lockfile --only=production

# Builder stage
FROM base AS builder
COPY package*.json ./
COPY turbo.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --frozen-lockfile

COPY apps/frontend ./apps/frontend
COPY packages ./packages

# Build packages and application
RUN npm run build --workspace=@board3/types
RUN npm run build --workspace=@board3/shared
RUN npm run build --workspace=frontend

# Runtime stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy runtime files
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

# Expose port
EXPOSE 3000

# Set environment
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/frontend/server.js"]