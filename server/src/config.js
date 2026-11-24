const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment from root or server folder
const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 chars').default('change-me-long-random-string'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CREDENTIALS_KEY: z.string().optional().default(''),
  COLLECT_CRON: z.string().default('*/5 * * * *'),
  DAILY_SUMMARY_CRON: z.string().default('5 0 * * *'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  DAYTIME_START_HOUR: z.coerce.number().default(7),
  DAYTIME_END_HOUR: z.coerce.number().default(18),
  ADMIN_NAME: z.string().default('Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(6).default('change-me-now')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation error:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

module.exports = parsed.data;
