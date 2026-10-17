import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  buckets: { 'cafe-uploads': { access: 'private' } },
  functions: {
    cafepasswords: {
      name: 'Cafe password hashing',
      source: 'functions/passwords.ts',
      env: { PASSWORD_SERVICE_SECRET: process.env.PASSWORD_SERVICE_SECRET! },
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
