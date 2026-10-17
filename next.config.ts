import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: process.env.APP_RUNTIME === 'cloudflare' || Boolean(process.env.VERCEL) },
  outputFileTracingIncludes: { '/*': ['./node_modules/pg-cloudflare/dist/**/*'] },
};
export default nextConfig;
