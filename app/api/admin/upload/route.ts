import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { hasObjectStorage, objectStorage, uploadBucket } from '@/lib/object-storage';
import { prepareUpload, finishUpload, UploadValidationError } from '@/lib/direct-upload';
import { validImage, imageExtensions, MAX_IMAGE_BYTES } from '@/lib/upload-validation';

export async function POST(request: Request) {
  if ((await currentUser())?.role !== "admin") return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 403 });
  if (request.headers.get('content-type')?.startsWith('application/json')) {
    if (Number(request.headers.get('content-length')) > 4096) return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 }); }
    if (!hasObjectStorage()) return NextResponse.json({ mode: 'multipart' });
    try {
      if (body.action === 'prepare') return NextResponse.json(await prepareUpload(String(body.type), Number(body.size)), { headers: { 'Cache-Control': 'no-store' } });
      if (body.action === 'finish' && typeof body.token === 'string') return NextResponse.json(await finishUpload(body.token));
      return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
    } catch (error) {
      if (!(error instanceof UploadValidationError)) {
        const failure = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
        console.error('Upload storage error', JSON.stringify({ name: failure.name, status: failure.$metadata?.httpStatusCode, message: failure.message?.replace(/https?:\/\/\S+/g, '[url]').slice(0, 180) }));
      }
      return NextResponse.json({ error: error instanceof UploadValidationError ? error.message : 'Kho ảnh tạm thời không khả dụng' }, { status: error instanceof UploadValidationError ? 400 : 503 });
    }
  }
  // Reject oversized multipart bodies before parsing them into Worker memory.
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 5_001_024) return NextResponse.json({ error: "Ảnh tối đa 5 MB" }, { status: 400 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Ảnh tối đa 5 MB" }, { status: 400 });
  const ext = imageExtensions[file.type];
  if (!ext) return NextResponse.json({ error: "Chỉ nhận JPG, PNG hoặc WebP" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const valid = validImage(bytes, file.type);
  if (!valid) return NextResponse.json({ error: "Nội dung ảnh không hợp lệ" }, { status: 400 });
  const filename = `upload-${randomUUID()}.${ext}`;
  if (hasObjectStorage() || process.env.APP_RUNTIME === 'cloudflare') {
    try {
      await objectStorage().send(new PutObjectCommand({ Bucket: uploadBucket(), Key: filename, Body: bytes, ContentType: file.type, CacheControl: 'public,max-age=31536000,immutable' }));
      return NextResponse.json({ imagePath: `/api/media/${filename}` });
    } catch {
      return NextResponse.json({ error: 'Kho ảnh tạm thời không khả dụng' }, { status: 503 });
    }
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(process.cwd(),"public","images",filename), bytes, { flag: "wx" });
  return NextResponse.json({ imagePath: `/images/${filename}` });
}
