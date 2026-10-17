import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';

export default {
  async fetch(request: Request): Promise<Response> {
    const secret = process.env.PASSWORD_SERVICE_SECRET;
    if (!secret) return new Response('Service unavailable', { status: 503 });
    const supplied = Buffer.from(request.headers.get('x-secret') ?? '');
    const expected = Buffer.from(secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response('Unauthorized', { status: 401 });
    const pathname = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/hash', '/verify'].includes(pathname)) return new Response('Not found', { status: 404 });
    const text = await request.text();
    if (Buffer.byteLength(text) > 4096) return new Response('Payload too large', { status: 413 });
    let body: { password?: unknown; hash?: unknown };
    try { body = JSON.parse(text); } catch { return new Response('Invalid JSON', { status: 400 }); }
    if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 72) return new Response('Invalid password', { status: 400 });
    if (pathname === '/hash') {
      if (body.password.length < 8) return new Response('Invalid password', { status: 400 });
      return Response.json({ hash: await bcrypt.hash(body.password, 12) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (typeof body.hash !== 'string' || !/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/.test(body.hash)) return new Response('Invalid hash', { status: 400 });
    return Response.json({ valid: await bcrypt.compare(body.password, body.hash) }, { headers: { 'Cache-Control': 'no-store' } });
  },
};
