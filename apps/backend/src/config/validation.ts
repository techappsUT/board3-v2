import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  HOST: Joi.string().default('0.0.0.0'),
  
  // Frontend URL for CORS
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  
  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  
  // External APIs
  OPENAI_API_KEY: Joi.string().optional(),
  
  // Cloud Providers
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  
  AZURE_CLIENT_ID: Joi.string().optional(),
  AZURE_CLIENT_SECRET: Joi.string().optional(),
  AZURE_TENANT_ID: Joi.string().optional(),
  
  GCP_PROJECT_ID: Joi.string().optional(),
  GCP_SERVICE_ACCOUNT_KEY: Joi.string().optional(),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  SESSION_SECRET: Joi.string().min(32).required(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(1000),
  
  // File Upload
  MAX_FILE_SIZE: Joi.number().integer().default(10485760), // 10MB
  UPLOAD_DEST: Joi.string().default('./uploads'),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  
  // Monitoring
  SENTRY_DSN: Joi.string().optional(),
  PROMETHEUS_ENABLED: Joi.boolean().default(false),
  
  // Build info
  BUILD_TIME: Joi.string().optional(),
  GIT_COMMIT: Joi.string().optional(),
});