import './network.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const base = process.env.TEST_BASE_URL || 'https://shop-cafe-eight.vercel.app';
const env = process.env;
const s3 = new S3Client({ endpoint: env.UPLOAD_S3_ENDPOINT || env.AWS_ENDPOINT_URL_S3, region: env.UPLOAD_S3_REGION || env.AWS_REGION,
  forcePathStyle: true, credentials: { accessKeyId: env.UPLOAD_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID, secretAccessKey: env.UPLOAD_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY } });
const keys = new Set();
const c = await fetch(base + '/api/auth/csrf');
let cookies = c.headers.getSetCookie().map(x => x.split(';')[0]);
const { csrfToken } = await c.json();
const login = await fetch(base + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual',
  headers: { Cookie: cookies.join('; '), 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken, email: 'admin@nhacaphe.local', password: 'Admin1234!', callbackUrl: base + '/admin' }) });
await login.arrayBuffer();
cookies.push(...login.headers.getSetCookie().map(x => x.split(';')[0]));
const cookie = cookies.join('; ');
const session = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } }).then(r => r.json());
assert.equal(session.user?.role, 'admin');
const post = data => fetch(base + '/api/admin/upload', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(60000) });
async function prepare(bytes) {
  const response = await post({ action: 'prepare', type: 'image/jpeg', size: bytes.length });
  assert.equal(response.status, 200);
  const plan = await response.json();
  assert.equal(plan.mode, 'direct');
  keys.add(plan.fields.key); keys.add(plan.fields.key.replace('pending/', ''));
  return plan;
}
async function upload(plan, bytes) {
  const form = new FormData();
  for (const [key, value] of Object.entries(plan.fields)) form.set(key, value);
  form.set('file', new Blob([bytes], { type: 'image/jpeg' }), 'upload.jpg');
  const response = await fetch(plan.url, { method: 'POST', headers: { Origin: base }, body: form, signal: AbortSignal.timeout(60000) });
  await response.arrayBuffer();
  assert.ok(response.ok, 'Direct POST must succeed: ' + response.status);
}
try {
  const tooLarge = await post({ action: 'prepare', type: 'image/jpeg', size: 5_000_001 });
  await tooLarge.arrayBuffer(); assert.equal(tooLarge.status, 400);
  const wrongType = await post({ action: 'prepare', type: 'image/svg+xml', size: 100 });
  await wrongType.arrayBuffer(); assert.equal(wrongType.status, 400);
  const invalid = Buffer.from('not-a-jpeg');
  const badPlan = await prepare(invalid);
  await upload(badPlan, invalid);
  const bad = await post({ action: 'finish', token: badPlan.token });
  await bad.arrayBuffer(); assert.equal(bad.status, 400);
  const original = await readFile('public/images/product-01.jpg');
  const imageSize = Number(process.env.TEST_UPLOAD_BYTES || 5_000_000);
  const image = Buffer.concat([original, Buffer.alloc(imageSize - original.length)]);
  const plan = await prepare(image);
  const preflight = await fetch(plan.url, { method: 'OPTIONS', headers: { Origin: base, 'Access-Control-Request-Method': 'POST' } });
  await preflight.arrayBuffer(); assert.ok([base, '*'].includes(preflight.headers.get('access-control-allow-origin')), 'Credentialless signed upload must pass browser CORS');
  await upload(plan, image);
  const tampered = await post({ action: 'finish', token: (plan.token[0] === 'a' ? 'b' : 'a') + plan.token.slice(1) });
  await tampered.arrayBuffer(); assert.equal(tampered.status, 400);
  const finished = await post({ action: 'finish', token: plan.token });
  const result = await finished.json(); assert.equal(finished.status, 200, JSON.stringify(result));
  const response = await fetch(base + result.imagePath, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200);
  assert.ok(Buffer.from(await response.arrayBuffer()).equals(image));
  console.log(`PASS direct browser upload: ${imageSize} bytes, CORS preflight, finalize validation, private media read with matching bytes`);
  console.log('PASS oversized/unsupported/fake images and modified upload tokens rejected');
} finally {
  for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: env.UPLOAD_BUCKET || 'cafe-uploads', Key }));
  s3.destroy();
}
