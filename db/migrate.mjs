import { migrationUrl } from './env.mjs';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const client = new pg.Client({ connectionString: migrationUrl, connectionTimeoutMillis: 20000 });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  for (const name of ['001_schema.sql', '002_domain.sql', '003_domain_details.sql', '004_storefront.sql']) {
    const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
    if (rowCount) continue;
    await client.query(await readFile(join(dir, name), 'utf8'));
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
    console.log(`Applied ${name}`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
