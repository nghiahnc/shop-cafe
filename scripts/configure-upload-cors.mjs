import { config } from 'dotenv';
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
config({ path: ['.env.vercel.local', '.env.local'], quiet: true });
const origins = process.argv.slice(2);
if (!origins.length || origins.some(value => new URL(value).origin !== value)) throw new Error('Supply exact upload origins, e.g. https://shop.vercel.app');
const env = process.env;
const s3 = new S3Client({ endpoint: env.UPLOAD_S3_ENDPOINT || env.AWS_ENDPOINT_URL_S3, region: env.UPLOAD_S3_REGION || env.AWS_REGION,
  forcePathStyle: true, credentials: { accessKeyId: env.UPLOAD_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID, secretAccessKey: env.UPLOAD_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY } });
try {
  const Bucket = env.UPLOAD_BUCKET || 'cafe-uploads';
  let rules = [];
  try { rules = (await s3.send(new GetBucketCorsCommand({ Bucket }))).CORSRules || []; }
  catch (error) { if (!['NoSuchCORSConfiguration', 'NoSuchCORSConfigurationError'].includes(error.name) && error.$metadata?.httpStatusCode !== 404) throw error; }
  const existing = rules.find(rule => rule.ID === 'cafe-browser-uploads');
  const allowedOrigins = [...new Set([...(existing?.AllowedOrigins || []), ...origins])];
  await s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [...rules.filter(rule => rule.ID !== 'cafe-browser-uploads'),
    { ID: 'cafe-browser-uploads', AllowedOrigins: allowedOrigins, AllowedMethods: ['POST'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 300 }] } }));
  console.log('Configured private bucket upload CORS for:', allowedOrigins.join(', '));
} finally { s3.destroy(); }
