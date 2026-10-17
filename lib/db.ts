import 'server-only';
import { Pool } from "pg";
import { after } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { attachDatabasePool } from '@vercel/functions';

declare global {
  // eslint-disable-next-line no-var
  var shopPool: Pool | undefined;
}

// ExecutionContext is unique to each Worker invocation, including API handlers.
// Weak keys prevent retaining completed requests in a long-lived isolate.
const workerPools = new WeakMap<object, Pool>();
function getWorkerPool() {
  const { env, ctx } = getCloudflareContext();
  const existing = workerPools.get(ctx);
  if (existing) return existing;
  if (!env.HYPERDRIVE?.connectionString) throw new Error('Missing HYPERDRIVE binding');
  const pool = new Pool({ connectionString: env.HYPERDRIVE.connectionString, max: 3, connectionTimeoutMillis: 20000 });
  pool.on('error', error => console.error('Postgres connection error', error.message));
  workerPools.set(ctx, pool);
  after(async () => {
    try { await pool.end(); } finally { workerPools.delete(ctx); }
  });
  return pool;
}

export function getPool(): Pool {
  // All repositories within one request share at most three connections.
  if (process.env.APP_RUNTIME === 'cloudflare') return getWorkerPool();
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL trong .env.local");
  if (!global.shopPool) {
    global.shopPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: process.env.VERCEL ? 5 : 10,
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      connectionTimeoutMillis: 20000,
    });
    global.shopPool.on('error', error => console.error('Postgres connection error', error.message));
    if (process.env.VERCEL) attachDatabasePool(global.shopPool);
  }
  return global.shopPool;
}
