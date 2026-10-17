# Neon setup verification — Nhà Cà Phê

Verified 2026-10-15, Asia/Bangkok.

## Target and services

- App directory: `D:\TimViecLam\shop-cafe`.
- Organization: `org-twilight-union-31034439`.
- Project: `noisy-thunder-49847213` (the Neon Console currently displays its name as `Hoa`; the ID is exactly the one requested).
- Branch: `production`, ID `br-noisy-king-b50bfi1h`.
- Postgres 18, region `aws-us-east-2`, database `neondb`.
- Requested service: Postgres. Existing NextAuth, Stripe integration and Next.js HTTP handlers continue to use the application's backend.
- App running with `npm run start` at http://127.0.0.1:3002. Neon provisions the backend; this task did not publish the Next.js frontend to an external host.

## Setup and changes

1. Ran `npx neon skills -y`; installed the Neon agent skills locally.
2. Ran `npm i -g neon@latest`; installed CLI 8.4.5 successfully.
3. Ran the exact requested init command in the app root:

   ```text
   neon init -y --org-id org-twilight-union-31034439 --project-id noisy-thunder-49847213 --branch production --services postgres
   ```

   It created `.neon`, `neon.ts`, installed `@neon/config` and `@neon/env`, and installed/enabled the Codex Neon plugin. The plugin bundles the OAuth MCP server at `https://mcp.neon.tech/mcp`; no duplicate Codex MCP registration was added. Init also detected and configured other installed agents automatically.

4. The first deployment waited for browser sign-in. The user completed sign-in; deployment continued successfully:

   ```text
   Auth complete (profile DEFAULT)
   → Applying to branch production (br-noisy-king-b50bfi1h)
   No changes — branch production already matches the policy.

   Utilized services: Postgres
   Pulled 3 Neon variables into .env.local
     Postgres        DATABASE_URL, DATABASE_URL_UNPOOLED
     Branch          NEON_BRANCH
   ```

5. Kept `pg`, appropriate for this persistent Node.js Next.js runtime and its interactive transactions. `lib/db.ts` remains the common runtime pool using `DATABASE_URL`, with a server-only boundary and a 20-second connection timeout. The app URL is the pooled Neon URL.
6. Added `db/env.mjs`: database scripts and storefront tests read `.env.local` then `.env`, honoring process environment overrides. Migration uses `DATABASE_URL_UNPOOLED` with local fallback.
7. Updated database verification to accept the database named by `DATABASE_URL` instead of assuming `shop_cafe`. Fixed seed insertion to include `subtotal_vnd`, required after the storefront migration on a fresh database.
8. Updated `.env.example`, ignored all secret env files and `.neon`, and documented the setup in `README.md`. No secret values are included in this report.
9. Added `npm run test:neon` for actual Neon connectivity, server-rendered catalog pages, authentication, authorization and transactional order round trips.

## Schema and sample data

The destination's `public` schema was empty before initialization. Created temporary branch `setup-cafe-validation-20261015`, applied all four migrations twice to check idempotency, seeded it and ran database verification successfully. Applied the same migrations and seed to production. Deleted the temporary branch afterwards; branch listing confirms only `production` remains.

```text
Applied 001_schema.sql
Applied 002_domain.sql
Applied 003_domain_details.sql
Applied 004_storefront.sql
Seed hoàn tất: 12 sản phẩm, 25 khách, 120 đơn.
Tài khoản và khuyến mãi demo đã sẵn sàng.
neondb: 12 sản phẩm, 25 khách, 120 đơn; tiền, tồn và 12 ảnh hợp lệ.
```

This initialized Neon from the repository's sample data. It did not copy existing local PostgreSQL records. After the HTTP order test, counts are 12 products, 26 customers (including the demo customer's profile created by checkout), 120 orders, two users and three promotions. There are zero remaining test web orders, temporary promotions or temporary registered users. The test upload was removed.

## Build, start and end-to-end results

`npm run build` exited 0; full output: build.log (`build.log`, lưu cục bộ).

```text
▲ Next.js 16.4.0 (Turbopack)
✓ Compiled successfully in 3.3s
  Finished TypeScript in 4.7s ...
✓ Generating static pages using 11 workers (15/15) in 241ms
```

Started the built production app using `npm run start`:

```text
▲ Next.js 16.4.0
- Local:         http://127.0.0.1:3002
✓ Ready in 180ms
```

`npm run test:neon` exited 0; full final output: e2e.log (`e2e.log`, lưu cục bộ).

```text
PASS HTTP 200 /: renders the Neon catalog
PASS HTTP 200 /products: renders the Neon catalog
PASS HTTP 200 /products/cf-001: renders the Neon catalog
PASS Neon Postgres: database=neondb, TLS=TLSv1.3, certificate=verified, pooled=true, migrations=4
Storefront: đăng ký/đăng nhập, quyền admin, upload ảnh; hai đơn đồng thời dùng mã max 1 chỉ một đơn thành công.
PASS order round trip: create -> order history -> cancel; inventory and promotion use restored in Postgres.
```

The tests exercise the running Next.js server and verify resulting records in Neon. They cover anonymous order rejection (401), customer rejection from admin mutation (403), customer/admin login, admin dashboard access, user registration and subsequent login, image upload, concurrent limited-promotion checkout (201 and 400), order history, inventory reservation, cancellation and release of stock/promotion redemption.

`neon config plan` also succeeded with no changes and `Utilized services: Postgres`.

## Failures, corrections and remaining limitations

- Initial CLI authentication was missing. Browser sign-in completed successfully; deployment and database access now work.
- The first version of the new TLS test failed because it checked `pg_stat_ssl`, which describes the proxy-to-Postgres connection. The actual client connection was already an encrypted, authorized `TLSSocket` using TLS 1.3. Corrected the test to inspect the client transport and reran the complete suite successfully.
- `pg` emits a non-fatal warning about future `sslmode=require` semantics. Current certificate validation is enabled and verified by the test. Neither certificate checking nor TLS was disabled.
- npm emitted a global install-script warning for esbuild. CLI init, config evaluation and deployment nevertheless completed successfully.
- The newly installed Codex plugin's MCP OAuth handshake was not exercised in this running chat; the plugin may require reload and its own first-use OAuth sign-in. CLI OAuth and all application checks were exercised successfully.
- Stripe and Google OAuth were not migrated to Neon or retested against their external providers; only Postgres was requested. The existing NextAuth credentials flow was tested against Neon.

References: installed Neon skill (`SKILL.md`, lưu cục bộ), installed Postgres skill (`SKILL.md`, lưu cục bộ), [official connection guide](https://neon.com/docs/connect/choose-connection), [official secure connection guide](https://neon.com/docs/connect/connect-securely).

> Bản GitHub chỉ giữ ảnh/báo cáo đã rà soát; các log và tệp bằng chứng ghi là ‘lưu cục bộ’ không được công khai.
