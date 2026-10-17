import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { objectStorage, uploadBucket } from './object-storage';
import { imageExtensions, MAX_IMAGE_BYTES, validImage } from './upload-validation';

type UploadClaim = { key: string; filename: string; type: string; size: number; expires: number };
export class UploadValidationError extends Error {}
function signature(payload: string): Buffer {
  if (!process.env.AUTH_SECRET) throw new Error('Missing AUTH_SECRET');
  return createHmac('sha256', process.env.AUTH_SECRET).update('cafe-upload-v1:' + payload).digest();
}

export async function prepareUpload(type: string, size: number) {
  const ext = imageExtensions[type];
  if (!ext || !Number.isInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) throw new UploadValidationError('Chỉ nhận JPG/PNG/WebP, tối đa 5 MB');
  const filename = `upload-${randomUUID()}.${ext}`;
  const claim: UploadClaim = { key: `pending/${filename}`, filename, type, size, expires: Date.now() + 120_000 };
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const token = payload + '.' + signature(payload).toString('base64url');
  const post = await createPresignedPost(objectStorage(), {
    Bucket: uploadBucket(), Key: claim.key, Expires: 120,
    Fields: { 'Content-Type': type },
    Conditions: [['content-length-range', 1, MAX_IMAGE_BYTES], ['eq', '$Content-Type', type]],
  });
  return { mode: 'direct', url: post.url, fields: post.fields, token };
}

export async function finishUpload(token: string) {
  if (token.length > 2048) throw new UploadValidationError('Phiên tải ảnh không hợp lệ');
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra) throw new UploadValidationError('Phiên tải ảnh không hợp lệ');
  const expected = signature(payload), supplied = Buffer.from(mac, 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UploadValidationError('Phiên tải ảnh không hợp lệ');
  let claim: UploadClaim;
  try { claim = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new UploadValidationError('Phiên tải ảnh không hợp lệ'); }
  if (claim.expires < Date.now() || !/^upload-[0-9a-f-]{36}\.(jpg|png|webp)$/.test(claim.filename) || claim.key !== 'pending/' + claim.filename || !imageExtensions[claim.type] || claim.size > MAX_IMAGE_BYTES || claim.size < 1) throw new UploadValidationError('Phiên tải ảnh đã hết hạn hoặc không hợp lệ');
  const s3 = objectStorage(), Bucket = uploadBucket();
  let stage = 'read';
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket, Key: claim.key }));
    if (!object.Body || object.ContentLength !== claim.size) throw new UploadValidationError('Kích thước ảnh không hợp lệ');
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    if (bytes.length !== claim.size || !validImage(bytes, claim.type)) throw new UploadValidationError('Nội dung ảnh không hợp lệ');
    // Pending objects stay private and cannot be served by the media route.
    stage = 'save';
    await s3.send(new PutObjectCommand({ Bucket, Key: claim.filename, Body: bytes, ContentType: claim.type, CacheControl: 'public,max-age=31536000,immutable' }));
    stage = 'cleanup';
    await s3.send(new DeleteObjectCommand({ Bucket, Key: claim.key }));
    return { imagePath: `/api/media/${claim.filename}` };
  } catch (error) {
    if (error instanceof UploadValidationError) await s3.send(new DeleteObjectCommand({ Bucket, Key: claim.key })).catch(() => {});
    else {
      const failure = error as { name?: string; cause?: { code?: string; cause?: { code?: string } } };
      console.error('Upload finalize failure', JSON.stringify({ stage, name: failure.name, code: failure.cause?.code || failure.cause?.cause?.code }));
    }
    throw error;
  } finally { s3.destroy(); }
}
