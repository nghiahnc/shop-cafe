import './network.mjs';
import '../db/env.mjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const base = process.env.TEST_BASE_URL || 'https://shop-cafe.lumora-studio.workers.dev';
const artifactDir = process.env.TEST_ARTIFACT_DIR || 'artifacts/cloudflare';
const stateFile = artifactDir + '/persistence-state.json';
const phase = process.argv[2];
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000 });
async function login(email, password) {
  const csrf = await fetch(base + '/api/auth/csrf');
  let cookies = csrf.headers.getSetCookie().map(c => c.split(';')[0]);
  const { csrfToken } = await csrf.json();
  const result = await fetch(base + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies.join('; ') },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: base + '/account/orders' }) });
  await result.arrayBuffer();
  cookies.push(...result.headers.getSetCookie().map(c => c.split(';')[0]));
  const cookie = cookies.join('; ');
  const session = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } }).then(r => r.json());
  assert.equal(session.user?.email, email, 'Login must succeed');
  return cookie;
}
async function post(path, data, cookie) {
  return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(data) });
}
await db.connect();
try {
  if (phase === 'prepare') {
    const admin = await login('admin@nhacaphe.local', 'Admin1234!');
    const image = await readFile('public/images/product-01.jpg');
    const form = new FormData(); form.set('file', new Blob([image], { type: 'image/jpeg' }), 'persistence.jpg');
    const response = await fetch(base + '/api/admin/upload', { method: 'POST', headers: { Cookie: admin }, body: form });
    assert.equal(response.status, 200);
    const { imagePath } = await response.json();
    const sku = 'CFQA-' + randomUUID().slice(0, 8);
    const categoryId = (await db.query('SELECT id::int FROM categories ORDER BY id LIMIT 1')).rows[0].id;
    const saved = await post('/api/admin/products', { sku, name: 'Cafe upload persistence QA', description: 'Temporary product for deploy verification.',
      categoryId, priceVnd: 49000, stock: 3, imagePath, serving: 'Đá', isDrink: true, sizeSDeltaVnd: -5000, sizeLDeltaVnd: 10000, active: true }, admin);
    const data = await saved.json(); assert.equal(saved.status, 201, JSON.stringify(data));
    await writeFile(stateFile, JSON.stringify({ productId: data.id, imagePath, slug: sku.toLowerCase() }, null, 2));
    console.log('PASS image uploaded and saved on a product before redeploy');
  } else if (phase === 'verify') {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    try {
      const image = await readFile('public/images/product-01.jpg');
      const downloaded = await fetch(base + state.imagePath + '?persistence=after-deploy');
      assert.equal(downloaded.status, 200); assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(image));
      assert.equal((await db.query('SELECT image_path FROM products WHERE id=$1', [state.productId])).rows[0].image_path, state.imagePath);
      const page = await fetch(base + '/products/' + state.slug);
      assert.equal(page.status, 200); assert.ok((await page.text()).includes(state.imagePath));
      console.log('PASS image bytes, product DB reference and storefront survive redeploy');
    } finally {
      await db.query('DELETE FROM products WHERE id=$1', [state.productId]);
      const s3 = new S3Client({ endpoint: process.env.UPLOAD_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3, region: process.env.UPLOAD_S3_REGION || process.env.AWS_REGION, forcePathStyle: true,
        credentials: { accessKeyId: process.env.UPLOAD_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.UPLOAD_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY } });
      try { await s3.send(new DeleteObjectCommand({ Bucket: 'cafe-uploads', Key: state.imagePath.split('/').at(-1) })); } finally { s3.destroy(); }
      await unlink(stateFile);
    }
  } else if (phase === 'checkout') {
    const customer = await login('demo@nhacaphe.local', 'Demo1234!');
    const productId = (await db.query('SELECT id::int FROM products WHERE active=true ORDER BY id LIMIT 1')).rows[0].id;
    const response = await post('/api/checkout', { items: [{ productId, quantity: 1, options: { size: 'M', ice: 0, sugar: 100 } }],
      name: 'Khách demo', phone: '0901234567', fulfillment: 'pickup', address: '', city: '', note: 'Cloudflare sandbox E2E', method: 'stripe' }, customer);
    const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result)); assert.ok(result.url?.startsWith('https://checkout.stripe.com/'));
    const row = (await db.query('SELECT o.id::text,p.stripe_session_id FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.code=$1', [result.code])).rows[0];
    await writeFile(artifactDir + '/checkout-state.json', JSON.stringify({ ...row, code: result.code, url: result.url }, null, 2));
    console.log(JSON.stringify({ checkoutUrl: result.url, orderId: row.id, code: result.code }));
  } else throw new Error('Expected prepare, verify or checkout');
} finally { await db.end(); }
