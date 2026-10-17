# Báo cáo triển khai Cloudflare — 15/10/2026

**Kết quả: bản public hoạt động, chưa nghiệm thu hoàn tất mục tiêu Workers Free ổn định.** CPU của nhiều request vượt mức 10 ms được Cloudflare công bố; không tự nâng gói để vượt qua điều kiện này.

- URL: https://shop-cafe.lumora-studio.workers.dev
- Worker: `shop-cafe`; version hiện tại `a09356d5-1e76-4caa-98ae-9935d7fcbd25`.
- Next.js **16.4.1**, OpenNext **1.20.12**, Wrangler **4.151.0**, đã khóa trong lockfile.
- Neon project `noisy-thunder-49847213`, nhánh `production` (`br-noisy-king-b50bfi1h`), database `neondb`.
- Neon org đã xác minh Free. Cloudflare API cũng xác nhận Free qua lỗi `100328` khi thử đặt CPU limit. Không kích hoạt Workers Paid, R2 hay Cloudflare Images.
- Upload cuối: 9752.35 KiB, gzip 1993.60 KiB; startup 33 ms. Xem deploy-final.log (`deploy-final.log`, lưu cục bộ).

## Thay đổi

Workers dùng Node.js compatibility và OpenNext, static assets, ảnh không tối ưu động. Giữ lệnh local hiện có. Có lệnh build/preview/deploy Cloudflare và hướng dẫn trong README. Windows dùng junction cho thư mục build để xử lý EPERM mà không cần quyền admin.

Hyperdrive `shop-cafe-neon` kết nối direct Neon, `verify-full` với CA ISRG Root X1, query cache tắt. Pool `pg` thuộc ExecutionContext của request, tối đa ba kết nối, được đóng bằng `after()`. Node local giữ pool hiện có. Không thay schema, không chạy migration/seed trong đợt này.

Function `cafepasswords` thực hiện bcrypt cost 12, kiểm tra shared secret bằng timing-safe comparison trước xử lý. Worker chỉ gọi qua HTTPS từ server. Không có secret hoặc mật khẩu trong client/log. Khi Function lỗi, đăng ký trả 503 và đăng nhập trả mã `password_service_unavailable`, không giảm cost hay fallback bcrypt trong Worker.

Bucket private `cafe-uploads` giữ ảnh mới; API upload giữ response `{ imagePath }`. API media phục vụ ảnh UUID và Cache-Control public immutable. Giữ MIME/signature JPG, PNG, WebP và giới hạn 5 MB; thêm kiểm tra Content-Length trước khi parse multipart lớn. 12 ảnh sản phẩm hiện có hợp lệ, không cần tìm/tải ảnh thay thế. Nguồn ảnh cũ giữ trong ASSET_SOURCES.md.

Đưa lên Worker chín biến theo allowlist: AUTH_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PASSWORD_SERVICE_URL, PASSWORD_SERVICE_SECRET, AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION. Hyperdrive origin giữ DB credential; không đưa URL migration hoặc Neon API key vào bundle. Loại fallback env riêng tư mà OpenNext sinh từ `.env.local`; scan 1.750 JS/JSON files có **0** giá trị secret đã biết (bundle-scan.json (`bundle-scan.json`, lưu cục bộ)). `.env.local` và Stripe local được giữ.

Stripe dùng fetch và xác minh webhook bất đồng bộ Web Crypto. Tạo endpoint **test mode** riêng `we_1UQrDuHiUQrZVMgzDq7VHr5Q`, URL public `/api/stripe/webhook`, bốn sự kiện checkout ứng dụng đang xử lý. Google OAuth tiếp tục tắt. IDs tài nguyên trong resources.json (`resources.json`, lưu cục bộ).

## Kiểm thử và output

| Kiểm tra | Kết quả/bằng chứng |
| --- | --- |
| `npm run build` | PASS: `Compiled successfully in 1621ms`; TypeScript 5.3s; log (`build-node-final.log`, lưu cục bộ) |
| `npm run build:cloudflare` | PASS: `OpenNext build complete.`; `Removed private env fallbacks from Worker bundle`; log (`build-final.log`, lưu cục bộ) |
| Workers local + nhánh Neon tạm | PASS đăng ký/đăng nhập, quyền, ảnh, giới hạn ảnh, tranh mã, đặt/hủy/hoàn tồn; log (`qa-e2e.log`, lưu cục bộ) |
| Production Function | PASS thiếu secret 401, hash cost 12, verify đúng/sai; log (`production-function.log`, lưu cục bộ) |
| Giả lập Function không khả dụng trên Workers local | PASS đăng ký 503; đăng nhập lỗi dịch vụ; không có session/fallback; log (`password-outage.log`, lưu cục bộ) |
| Trang chủ, thực đơn, chi tiết public | PASS HTTP 200, catalog Neon; 4 migrations, TLSv1.3 verified; log (`public-preflight-final.log`, lưu cục bộ) |
| Đăng ký, login đúng/sai, khách/admin, dashboard | PASS trên public; có assertion cookie Secure qua HTTPS; log (`public-storefront-final.log`, lưu cục bộ) |
| Upload/đọc ảnh; ảnh không hợp lệ | PASS trên public; bytes đọc lại khớp; log (`public-storefront-final.log`, lưu cục bộ) |
| Ảnh gắn sản phẩm qua một lần redeploy | PASS bytes, DB reference và trang sản phẩm; log (`persistence.log`, lưu cục bộ) |
| Ảnh quá dung lượng public | **CHƯA ĐẠT**: Node ECONNRESET/timeout; curl timeout sau 30s, chưa nhận response cuối. Test Workers local đã PASS. log (`public-oversized-upload.log`, lưu cục bộ) |
| Hai đơn đồng thời tranh mã max_uses=1 | PASS đúng một 201, một 400; redemption=1; log (`public-storefront-final.log`, lưu cục bộ) |
| Đặt → lịch sử → hủy → hoàn tồn/lượt mã | PASS trên public và đối chiếu Postgres; log (`public-storefront-final.log`, lưu cục bộ) |
| Thanh toán Stripe sandbox qua Checkout trên trình duyệt | PASS `complete paid livemode false`; DB order/payment paid, inventory movement=1; log (`stripe-checkout.log`, lưu cục bộ), kết quả (`checkout-result.json`, lưu cục bộ) |
| Webhook chữ ký sai, success, duplicate, failure | PASS trên public; duplicate không cập nhật hai lần; log (`public-webhook-final.log`, lưu cục bộ) |
| Request đầu/lặp/8 đồng thời | 16/16 HTTP 200, không có trang lỗi 1102; log (`load.log`, lưu cục bộ) |
| Workers logs | 180 request `outcome=ok`, 0 uncaught exceptions; chưa thấy exceededCpu/1102 hoặc lỗi I/O dùng chéo request; CPU summary (`cpu-summary.json`, lưu cục bộ), log an toàn (`requests.jsonl`, lưu cục bộ) |
| `npm audit` | 0 vulnerabilities sau override glob 10.5.0 cho build dependency; giữ adapter đã chỉ định; audit (`npm-audit-final.json`, lưu cục bộ) |
| Database/assets cuối | 12 sản phẩm, 120 đơn, tiền/tồn/12 ảnh hợp lệ; log (`db-final.log`, lưu cục bộ) |

Các output tiêu biểu:

```text
PASS HTTP 200 /: renders the Neon catalog
PASS HTTP 200 /products: renders the Neon catalog
PASS HTTP 200 /products/cf-001: renders the Neon catalog
PASS order round trip: create -> order history -> cancel; inventory and promotion use restored in Postgres.
PASS image bytes, product DB reference and storefront survive redeploy
PASS real Stripe sandbox Checkout -> public webhook -> paid once, stock reserved once
PASS password service outage: registration 503; login service error; no session or bcrypt fallback
```

## Điểm chặn và lỗi đã gặp

**CPU Free chưa đạt.** Trong log, trang chủ dùng 19–562 ms CPU; thực đơn 11–518 ms; admin 286–403 ms. Những con số này vẫn vượt ngân sách Free sau khi bcrypt đã chuyển ra Function. Không xem HTTP 200 hiện tại là bằng chứng chạy ổn định lâu dài: Cloudflare có phần dung sai theo isolate trước khi cưỡng chế giới hạn. Không ghi nhận 1102 trong mẫu thử, nhưng điều kiện nghiệm thu CPU của kế hoạch chưa đạt.

Thử đặt `limits.cpu_ms=10` bị API từ chối:

```text
CPU limits are not supported for the Free plan. ... [code: 100328]
```

Đã bỏ cấu hình không được hỗ trợ; lần deploy thất bại này không thay version đang phục vụ. Không nâng gói. Muốn hoàn tất mục tiêu 0 đồng cần giảm phần Next.js render/auth/SDK trong Worker hoặc thay cách phân chia frontend/backend, rồi đo lại CPU; chưa tự thực hiện thay đổi kiến trúc ngoài kế hoạch này.

Upload lớn trên public bị timeout trước khi nhận kết quả cuối, kể cả với curl; không tính là đã xác nhận public từ chối ảnh quá dung lượng. Một số lần test trước có connect timeout/ECONNRESET. Hai lần đọc media sau deploy nhận 503, các lần đọc/kiểm tra persistence và upload ở lượt cuối đã qua; chưa xác định được nguyên nhân hai lỗi 503 nên không khẳng định đã loại bỏ lỗi gián đoạn kho ảnh.

Lỗi build Windows EPERM đã xử lý bằng junction và dừng preview trước build. Lỗi trace thiếu pg-cloudflare đã xử lý bằng outputFileTracingIncludes. Npm audit trước đó có chuỗi cảnh báo high từ glob CLI của công cụ build; override đã đưa audit về 0. Cảnh báo pg SSL modes xuất hiện ở test nhưng kết nối thực tế vẫn verify certificate/TLS, không tắt TLS verification.

## Hạn mức và quản lý

Theo tài liệu tại thời điểm triển khai:

| Dịch vụ Free | Hạn mức liên quan |
| --- | --- |
| Workers | 100.000 request/ngày, CPU 10 ms/request, 128 MB RAM |
| Hyperdrive | 100.000 query/ngày |
| Neon Postgres | 1 GB/project; 100 CU-hours/project/tháng |
| Neon Object Storage | 5 GB/project |
| Neon Functions | 10 active Capacity-Hours, 400 waiting Capacity-Hours và 1 triệu invocation/project/tháng |
| Neon egress | 5 GB/project/tháng, dùng chung Postgres, Storage, Functions |

Nguồn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/), [Neon plans](https://neon.com/docs/introduction/plans). Đây là hạn mức công bố, không phải số dư còn lại hay cam kết dùng vô hạn.

Quản lý DB ở [Neon Console của project](https://console.neon.tech/app/projects/noisy-thunder-49847213): chọn production/neondb, dùng Tables hoặc SQL Editor. Quản lý Worker/log ở Cloudflare Workers & Pages → shop-cafe. Chỉ dùng Stripe test mode cho demo.

Nhánh `cafe-cf-qa-20261015` đã xóa; chỉ còn production trong project. Các user/sản phẩm/đơn thử đã dọn, ảnh thử đã xóa, tồn của đơn Stripe thử đã hoàn bằng cleanup. Giữ processed Stripe event để chặn redelivery; Stripe lưu lịch sử giao dịch test. Giữ demo customer hiện hữu. Không đụng endpoint Stripe local/ngrok cũ. Server Node local đã chạy lại ở http://127.0.0.1:3002; tiến trình preview và tail đã dừng.





> Bản GitHub chỉ giữ ảnh/báo cáo đã rà soát; các log và tệp bằng chứng ghi là ‘lưu cục bộ’ không được công khai.
