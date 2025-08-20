import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/board3_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key-here-min-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-here-min-32-chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32characters!!';
process.env.SESSION_SECRET = 'test-session-secret-key-here-min-32-chars';

// Global test configuration
export const createTestingModule = async (modules: any[] = []) => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            NODE_ENV: 'test',
            DATABASE_URL: process.env.DATABASE_URL,
            REDIS_URL: process.env.REDIS_URL,
            JWT_SECRET: process.env.JWT_SECRET,
            JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
            SESSION_SECRET: process.env.SESSION_SECRET,
          }),
        ],
      }),
      ...modules,
    ],
  });

  return moduleBuilder.compile();
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods to reduce noise in tests
  // eslint-disable-next-line no-console
  console.log = jest.fn();
  // eslint-disable-next-line no-console
  console.info = jest.fn();
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
  // eslint-disable-next-line no-console
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test helpers
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createMockUser = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isEmailVerified: true,
  mfaEnabled: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createMockJwtPayload = () => ({
  sub: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  permissions: ['projects.read', 'designs.read'],
  roles: ['user'],
});
