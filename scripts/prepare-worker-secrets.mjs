import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'dotenv';

const env = parse(readFileSync('.env.cloudflare.local'));
const keys = ['AUTH_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PASSWORD_SERVICE_URL', 'PASSWORD_SERVICE_SECRET', 'AWS_ENDPOINT_URL_S3', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
const secrets = Object.fromEntries(keys.map(key => {
  if (!env[key]) throw new Error(`Missing ${key} in .env.cloudflare.local`);
  return [key, env[key]];
}));
writeFileSync('.env.worker-secrets.local', JSON.stringify(secrets, null, 2));
console.log(`Prepared ${keys.length} allowlisted Worker secrets; API keys and migration credentials excluded.`);
