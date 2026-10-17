import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';

const env = parse(readFileSync('.env.vercel.local'));
const secretKeys = ['DATABASE_URL', 'AUTH_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PASSWORD_SERVICE_SECRET', 'UPLOAD_S3_ACCESS_KEY_ID', 'UPLOAD_S3_SECRET_ACCESS_KEY'];
const configKeys = ['AUTH_URL', 'APP_RUNTIME', 'PASSWORD_SERVICE_URL', 'UPLOAD_S3_ENDPOINT', 'UPLOAD_S3_REGION', 'UPLOAD_BUCKET', 'STRIPE_CHECKOUT_CURRENCY', 'DEMO_VND_PER_USD'];
const entries = [...secretKeys, ...configKeys].map(key => {
  if (!env[key]) throw new Error(`Missing ${key} in .env.vercel.local`);
  return { key, value: env[key], type: secretKeys.includes(key) ? 'sensitive' : 'encrypted', target: ['production'] };
});
const cache = join(process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'npm-cache') : join(homedir(), '.npm'), '_npx');
let cli;
for (const entry of readdirSync(cache)) {
  const root = join(cache, entry, 'node_modules/vercel');
  if (existsSync(join(root, 'package.json'))) {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json')));
    if (manifest.version === '64.2.0') { cli = join(root, manifest.bin.vercel); break; }
  }
}
if (!cli) throw new Error('Run npx vercel@64.2.0 whoami first');
for (const entry of entries) {
  const result = spawnSync(process.execPath, [cli, 'env', 'add', entry.key, 'production', entry.type === 'sensitive' ? '--sensitive' : '--no-sensitive', '--force', '--yes'], { input: entry.value, stdio: ['pipe', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    let message = result.stderr.toString();
    for (const value of Object.values(env)) if (value) message = message.replaceAll(value, '[redacted]');
    throw new Error(`Vercel env upload failed for ${entry.key}: ${message}`);
  }
  console.log(`Configured ${entry.key}`);
}
console.log(`Uploaded ${entries.length} allowlisted production env values; migration/API credentials excluded.`);
