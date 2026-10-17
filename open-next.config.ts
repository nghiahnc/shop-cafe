import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Catalog/account pages are dynamic; no paid image or R2 cache binding.
export default defineCloudflareConfig({});
