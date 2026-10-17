import 'server-only';

export class PasswordServiceError extends Error {
  constructor() { super('Password service unavailable'); this.name = 'PasswordServiceError'; }
}

async function remote<T>(operation: 'hash' | 'verify', body: object): Promise<T> {
  const url = process.env.PASSWORD_SERVICE_URL;
  const secret = process.env.PASSWORD_SERVICE_SECRET;
  if (!url || !secret) throw new PasswordServiceError();
  try {
    const response = await fetch(new URL(operation, url.endsWith('/') ? url : url + '/'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Secret': secret },
    body: JSON.stringify(body), redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
    if (!response.ok) throw new PasswordServiceError();
    return await response.json() as T;
  } catch { throw new PasswordServiceError(); }
}

export async function hashPassword(password: string): Promise<string> {
  if (process.env.APP_RUNTIME === 'cloudflare' || process.env.PASSWORD_SERVICE_URL) return (await remote<{ hash: string }>('hash', { password })).hash;
  return (await import('bcryptjs')).hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (process.env.APP_RUNTIME === 'cloudflare' || process.env.PASSWORD_SERVICE_URL) return (await remote<{ valid: boolean }>('verify', { password, hash })).valid;
  return (await import('bcryptjs')).compare(password, hash);
}
