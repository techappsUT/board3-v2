# Board3 Backend Database Layer

This document describes the comprehensive database implementation for Board3,
featuring PostgreSQL with Prisma ORM, Redis caching, and security optimizations.

## 🗄️ Database Architecture

### Core Technologies

- **PostgreSQL 15+**: Primary relational database
- **Prisma ORM**: Type-safe database client and migrations
- **Redis 7**: Caching and session storage
- **NestJS**: Dependency injection and modular architecture

### Schema Overview

The database schema includes the following main entities:

#### User Management

- `users` - User accounts with authentication data
- `organizations` - Multi-tenant organizations
- `organization_members` - User-organization relationships
- `roles` - RBAC role definitions
- `permissions` - Granular permission system

#### Design System

- `designs` - Cloud infrastructure designs/architectures
- `design_versions` - Version history for designs
- `templates` - Reusable design templates
- `resources` - Individual cloud resources within designs

#### Infrastructure Management

- `states` - Terraform state management (encrypted)
- `pipelines` - CI/CD pipeline definitions
- `pipeline_executions` - Pipeline execution history
- `pipeline_stages` - Individual pipeline stages

#### Monitoring & Audit

- `drift_logs` - Infrastructure drift detection
- `audit_logs` - Complete audit trail
- `notifications` - User notifications
- `sessions` - Active user sessions

#### Collaboration

- `design_shares` - Design sharing permissions
- `comments` - Design collaboration comments

## 🚀 Quick Start

### Environment Setup

1. **Copy environment file:**

```bash
cp .env.example .env
```

2. **Configure database connection:**

```env
DATABASE_URL="postgresql://board3:password@localhost:5432/board3_dev?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Generate encryption keys:**

```bash
# Generate 32-byte hex keys for AES-256 encryption
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 32  # For TERRAFORM_STATE_ENCRYPTION_KEY
```

### Database Migration

Run the automated migration script:

```bash
chmod +x scripts/migrate-db.sh
./scripts/migrate-db.sh
```

Or run individual commands:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name "initial-setup"

# Seed database with initial data
npm run db:seed
```

### Development Commands

```bash
# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database

# Application
npm run dev            # Start development server
npm run type-check     # TypeScript validation
npm run test           # Run tests
```

## 🔒 Security Features

### Encryption

- **AES-256 encryption** for Terraform states
- **Encrypted API keys** and sensitive configuration
- **bcrypt password hashing** with 12 rounds
- **Row-level security** considerations in schema design

### Authentication & Authorization

- **JWT-based authentication** with refresh tokens
- **Role-based access control (RBAC)** with granular permissions
- **API key management** with scoped permissions
- **Session management** with Redis storage

### Audit & Monitoring

- **Comprehensive audit logging** for all operations
- **Real-time drift detection** for infrastructure changes
- **Security event tracking** (logins, permissions changes)
- **Performance monitoring** with health checks

## 📊 Database Schema Details

### Key Relationships

```sql
-- User belongs to multiple organizations
users 1:N organization_members N:1 organizations

-- Organizations have roles with permissions
organizations 1:N roles 1:N permissions

-- Designs belong to organizations and users
organizations 1:N designs N:1 users

-- Designs can be created from templates
templates 1:N designs

-- Designs have resources and states
designs 1:N resources
designs 1:N states

-- States track drift and have logs
states 1:N drift_logs

-- Pipelines execute on designs
designs 1:N pipelines 1:N pipeline_executions
```

### Indexes and Performance

Key indexes for optimal performance:

- User email and username lookups
- Organization slug and domain matching
- Design filtering by creator, organization, status
- Template search by category and cloud provider
- State and drift detection queries
- Audit log time-range queries

### Data Types and Constraints

- **UUIDs** for all primary keys (CUID format)
- **JSON columns** for flexible configuration storage
- **Enum types** for consistent status values
- **Timestamp tracking** (created_at, updated_at)
- **Soft deletes** where appropriate

## 🔧 Services and Modules

### PrismaService

Central database service providing:

- Connection management with pooling
- Health checks and monitoring
- Transaction helpers
- Database statistics
- Test database cleanup utilities

### RedisService

Caching and session management:

- Session storage with TTL
- User data caching
- Design and template caching
- Rate limiting counters
- Pub/sub messaging for real-time features

### EncryptionService

Data security utilities:

- AES-256 encryption for sensitive data
- Terraform state encryption
- API key generation and verification
- Integrity hashing
- Secure random generation

### HealthService

Monitoring and diagnostics:

- Database connectivity checks
- Redis health monitoring
- Application metrics collection
- Kubernetes readiness/liveness probes

## 📈 Performance Optimizations

### Connection Pooling

- Configured connection pool size based on load
- Idle connection management
- Query timeout handling

### Caching Strategy

- User data cached for 30 minutes
- Design data cached for 10 minutes
- Template data cached for 20 minutes
- Session data with configurable TTL

### Query Optimization

- Strategic indexing on frequently queried columns
- Pagination for large result sets
- Prepared statements through Prisma
- Connection reuse and pooling

## 🧪 Testing

### Database Testing

```bash
# Unit tests for database services
npm run test:unit

# Integration tests with test database
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Test Database Management

The `PrismaService` includes utilities for test database cleanup:

```typescript
// Clean all tables for testing (test env only)
await prismaService.cleanDatabase();
```

## 🔍 Monitoring and Observability

### Health Endpoints

- `GET /health` - Overall application health
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/metrics` - Application metrics

### Logging

- Structured logging with Pino
- Database query logging in development
- Error tracking with stack traces
- Performance metrics collection

### Metrics Collection

- Database connection status
- Query performance statistics
- Cache hit/miss ratios
- User activity patterns
- Infrastructure drift detection rates

## 🚦 Development Workflow

### Schema Changes

1. Update `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name "description"`
3. Update seed data if needed
4. Test migration on development database
5. Update documentation

### Adding New Entities

1. Define model in schema with proper relations
2. Add appropriate indexes
3. Update seed script with sample data
4. Create service methods if needed
5. Add to health checks if critical

### Security Considerations

- Always encrypt sensitive data before database storage
- Use parameterized queries (Prisma handles this)
- Validate all inputs at service layer
- Implement audit logging for sensitive operations
- Regular security audits of database permissions

## 📚 API Examples

### Common Database Operations

```typescript
// Get user with organization and permissions
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    organizations: {
      include: {
        organization: true,
        role: {
          include: { permissions: true },
        },
      },
    },
  },
});

// Create design with template
const design = await prisma.design.create({
  data: {
    name: 'My Web App',
    description: 'Sample web application',
    cloudProvider: 'AWS',
    canvas: {
      /* design data */
    },
    templateId: 'template-uuid',
    creatorId: 'user-uuid',
    orgId: 'org-uuid',
  },
});

// Get designs with pagination
const designs = await prisma.design.findMany({
  where: { orgId: organizationId },
  include: {
    creator: { select: { firstName: true, lastName: true } },
    template: { select: { name: true, category: true } },
  },
  orderBy: { updatedAt: 'desc' },
  skip: page * limit,
  take: limit,
});
```

## 🔗 Related Documentation

- [Prisma Schema Reference](./prisma/schema.prisma)
- [Database Migration Script](./scripts/migrate-db.sh)
- [SQL Query Examples](./docs/database-examples.sql)
- [Environment Configuration](./.env.example)

---

For questions or issues with the database layer, please refer to the
[main project documentation](../../README.md) or open an issue in the
repository.
