import './network.mjs';
import assert from 'node:assert/strict';
import { databaseUrl } from '../db/env.mjs';
import pg from 'pg';

const url = new URL(databaseUrl);
assert.ok(url.hostname.endsWith('.neon.tech'), 'DATABASE_URL must point at Neon');
assert.ok(url.hostname.includes('-pooler'), 'Application traffic must use the pooled Neon URL');
const db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 20000 });
try {
  await db.connect();
  // Neon terminates client TLS at its proxy. pg_stat_ssl describes the
  // proxy-to-Postgres hop, so inspect the actual client transport instead.
  const transport = db.connection.stream;
  assert.equal(transport.encrypted, true, 'Neon client connection must use TLS');
  assert.equal(transport.authorized, true, 'Neon TLS certificate must be verified');
  const connection = (await db.query(`SELECT current_database() AS database,
    (SELECT COUNT(*)::int FROM schema_migrations) AS migrations`)).rows[0];
  assert.equal(connection.migrations, 4, 'All coffee shop migrations must be applied');
  const product = (await db.query('SELECT name,slug FROM products WHERE active=true ORDER BY id LIMIT 1')).rows[0];
  assert.ok(product, 'The coffee shop needs at least one active product');
  const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3002';
  for (const path of ['/', '/products', `/products/${product.slug}`]) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, `${path} must return HTTP 200`);
    const html = await response.text();
    assert.ok(html.includes(product.name), `${path} must render the product read from Neon`);
    console.log(`PASS HTTP 200 ${path}: renders the Neon catalog`);
  }
  console.log(`PASS Neon Postgres: database=${connection.database}, TLS=${transport.getProtocol()}, certificate=verified, pooled=true, migrations=${connection.migrations}`);
} finally {
  await db.end();
}
