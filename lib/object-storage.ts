import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';

export const uploadBucket = () => process.env.UPLOAD_BUCKET || 'cafe-uploads';
export const hasObjectStorage = () => Boolean((process.env.UPLOAD_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3) && (process.env.UPLOAD_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) && (process.env.UPLOAD_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY));
export function objectStorage(): S3Client {
  if (!hasObjectStorage()) throw new Error('Object storage is not configured');
  return new S3Client({
    endpoint: process.env.UPLOAD_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3, region: process.env.UPLOAD_S3_REGION || process.env.AWS_REGION || 'us-east-2', forcePathStyle: true,
    credentials: { accessKeyId: (process.env.UPLOAD_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)!, secretAccessKey: (process.env.UPLOAD_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)! },
    // Workers needs fetch; Node hosts use the SDK's native HTTP transport.
    requestHandler: process.env.APP_RUNTIME === 'cloudflare' ? new FetchHttpHandler() : undefined,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  });
}
