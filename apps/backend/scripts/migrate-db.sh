#!/bin/bash

# Board3 Database Migration Script
# This script handles database migrations for Board3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${NODE_ENV:-development}
FORCE_RESET=false
SKIP_SEED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --force-reset)
      FORCE_RESET=true
      shift
      ;;
    --skip-seed)
      SKIP_SEED=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment ENV  Set environment (development, test, production)"
      echo "  --force-reset         Force database reset (DANGER: deletes all data)"
      echo "  --skip-seed          Skip seeding after migration"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🚀 Board3 Database Migration Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo

# Check if required tools are installed
check_dependencies() {
  echo -e "${BLUE}🔍 Checking dependencies...${NC}"
  
  if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx is not installed. Please install Node.js.${NC}"
    exit 1
  fi
  
  if ! command -v prisma &> /dev/null && ! npx prisma --version &> /dev/null; then
    echo -e "${RED}❌ Prisma is not installed.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Dependencies OK${NC}"
}

# Check database connection
check_database() {
  echo -e "${BLUE}🔗 Checking database connection...${NC}"
  
  if ! npx prisma db pull --force &> /dev/null; then
    echo -e "${YELLOW}⚠️  Database connection failed or database doesn't exist${NC}"
    echo -e "${BLUE}📦 Creating database...${NC}"
    npx prisma db push --force-reset
  fi
  
  echo -e "${GREEN}✅ Database connection OK${NC}"
}

# Generate Prisma client
generate_client() {
  echo -e "${BLUE}🏗️  Generating Prisma client...${NC}"
  npx prisma generate
  echo -e "${GREEN}✅ Prisma client generated${NC}"
}

# Run migrations
run_migrations() {
  echo -e "${BLUE}🔄 Running database migrations...${NC}"
  
  if [ "$FORCE_RESET" = true ]; then
    echo -e "${RED}⚠️  FORCE RESET: This will DELETE ALL DATA!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      npx prisma migrate reset --force
    else
      echo -e "${YELLOW}Migration cancelled${NC}"
      exit 0
    fi
  else
    # Check if this is the first migration
    if [ ! -d "prisma/migrations" ]; then
      echo -e "${BLUE}📝 Creating initial migration...${NC}"
      npx prisma migrate dev --name "initial-setup"
    else
      echo -e "${BLUE}🔄 Applying pending migrations...${NC}"
      npx prisma migrate deploy
    fi
  fi
  
  echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Seed database
seed_database() {
  if [ "$SKIP_SEED" = true ]; then
    echo -e "${YELLOW}⏭️  Skipping database seeding${NC}"
    return
  fi
  
  echo -e "${BLUE}🌱 Seeding database...${NC}"
  
  if [ -f "prisma/seed.ts" ]; then
    npm run db:seed
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  No seed file found (prisma/seed.ts)${NC}"
  fi
}

# Verify migration
verify_migration() {
  echo -e "${BLUE}🔍 Verifying migration...${NC}"
  
  # Check if we can connect and query basic tables
  if npx prisma db pull --force &> /dev/null; then
    echo -e "${GREEN}✅ Migration verification passed${NC}"
  else
    echo -e "${RED}❌ Migration verification failed${NC}"
    exit 1
  fi
}

# Main execution
main() {
  echo -e "${BLUE}Starting migration process...${NC}"
  
  check_dependencies
  check_database
  generate_client
  run_migrations
  seed_database
  verify_migration
  
  echo
  echo -e "${GREEN}🎉 Database migration completed successfully!${NC}"
  echo
  echo -e "${BLUE}Next steps:${NC}"
  echo -e "  • Start your application: ${YELLOW}npm run dev${NC}"
  echo -e "  • View database: ${YELLOW}npm run db:studio${NC}"
  echo -e "  • Check migration status: ${YELLOW}npx prisma migrate status${NC}"
  echo
}

# Error handling
trap 'echo -e "${RED}❌ Migration failed!${NC}"; exit 1' ERR

# Run main function
main