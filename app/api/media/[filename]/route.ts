import { GetObjectCommand } from '@aws-sdk/client-s3';
import { objectStorage, uploadBucket } from '@/lib/object-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^upload-[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return new Response('Not found', { status: 404 });
  try {
    if (process.env.VERCEL) {
      const url = await getSignedUrl(objectStorage(), new GetObjectCommand({ Bucket: uploadBucket(), Key: filename }), { expiresIn: 300 });
      return new Response(null, { status: 307, headers: { Location: url, 'Cache-Control': 'public,max-age=60', 'X-Content-Type-Options': 'nosniff' } });
    }
    const object = await objectStorage().send(new GetObjectCommand({ Bucket: uploadBucket(), Key: filename }));
    if (!object.Body) return new Response('Not found', { status: 404 });
    return new Response(object.Body.transformToWebStream() as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': object.ContentType || 'application/octet-stream',
        'Cache-Control': 'public,max-age=31536000,immutable',
        'X-Content-Type-Options': 'nosniff',
        ...(object.ETag ? { ETag: object.ETag } : {}),
      },
    });
  } catch (error) {
    if ((error as { name?: string }).name === 'NoSuchKey' || (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return new Response('Not found', { status: 404 });
    console.error('Media storage error', (error as { name?: string }).name, (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode);
    return new Response('Storage unavailable', { status: 503 });
  }
}
