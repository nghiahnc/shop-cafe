import { config } from 'dotenv';

// Match Next.js precedence and support either env file written by neon deploy.
config({ path: ['.env.local', '.env'], quiet: true });
if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL trong .env.local hoặc .env');

export const databaseUrl = process.env.DATABASE_URL;
export const migrationUrl = process.env.DATABASE_URL_UNPOOLED || databaseUrl;
