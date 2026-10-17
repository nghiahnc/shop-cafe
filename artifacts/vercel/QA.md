# Vercel deployment QA — 16/10/2026

**Đã chuyển bản demo chính sang https://shop-cafe-eight.vercel.app.** Project `nghia138/shop-cafe`, plan **Hobby**, không nâng Pro hoặc bật add-on trả phí. Database, tài khoản và kho ảnh vẫn ở Neon production; không thay schema, không migration/seed lại.

- Project ID: `prj_XMFA0FhmV9uTIyvopo8mhPgerD5X`.
- Deployment cuối: `dpl_5dqZiXp8pdfu2hYtx2P4CXDZRaGS`, trạng thái READY, production.
- [Deployment inspector](https://vercel.com/nghia138/shop-cafe/5dqZiXp8pdfu2hYtx2P4CXDZRaGS).
- Next.js 16.4.1, Node 24.x. Vercel CLI local 64.2.0.
- Node Function region cấu hình `cle1` gần Neon aws-us-east-2; build chạy iad1 theo hạ tầng Vercel.
- Stripe test endpoint riêng `we_1UQs3vHiUQrZVMgzr237FReU`: `https://shop-cafe-eight.vercel.app/api/stripe/webhook`.

## Cấu hình và thay đổi

Vercel chạy Next.js Node.js trực tiếp, không qua OpenNext/Hyperdrive. Giữ `pg`, URL pooled của Neon, pool max 5, idle timeout 5 giây và `attachDatabasePool` cho Fluid Compute. Node local và code Cloudflare vẫn có nhánh cấu hình riêng. Cookie Secure theo runtime Vercel/Cloudflare hoặc AUTH_URL HTTPS. Giữ Function bcrypt cost 12 hiện có. Google OAuth tiếp tục tắt.

Đã upload 15 env theo allowlist vào production, secret nhạy cảm lưu dưới dạng Secret. Dùng `UPLOAD_S3_*` để tránh các biến AWS_* của runtime. Không đưa Neon API key, migration URL, `.env*`, `.dev.vars*`, `.neon`, artifacts hoặc test fixtures vào source deploy. `.vercelignore` và `.gitignore` đã cập nhật. Client bundle scan 24 files, 0 giá trị riêng tư đã biết (client-scan.json (`client-scan.json`, lưu cục bộ)).

Giữ ảnh static không tối ưu động để không dùng quota image transformations. Admin upload trực tiếp private Neon bucket qua presigned POST 120 giây, chỉ key pending cụ thể, MIME chỉ định, tối đa 5.000.000 bytes. Finalize cần admin và token HMAC, kiểm tra size/signature ảnh rồi ghi key UUID cuối. File pending chưa được public media phục vụ. Giữ response cuối `{ imagePath }` và API multipart cũ cho local/file nhỏ.

Vercel Function có giới hạn payload 4,5 MB: file 5 MB đi browser → Neon, không qua request body Function. API media redirect tới presigned GET 5 phút, cache redirect 60 giây, giúp cả download 5 MB đi trực tiếp Neon. S3 client dùng HTTP transport Node mặc định trên Vercel, giữ FetchHttpHandler riêng cho Workers. Bucket vẫn private; URL ký tạm không chứa secret key. CORS production đã cấu hình; origin local thử đã được gỡ.

## Kết quả kiểm thử

| Kiểm tra | Kết quả và log |
| --- | --- |
| Build local | PASS `npm run build`, compile 1041 ms, TypeScript 5.3 s; log (`local-build-final.log`, lưu cục bộ) |
| Build/deploy production | PASS `npm ci`, 0 vulnerabilities; `npm run build`, compile 538 ms; `/vercel/output` hoàn tất 24 s; log (`deploy-final.log`, lưu cục bộ) |
| Trang chủ, thực đơn, chi tiết | HTTP 200, catalog từ Neon; TLSv1.3 verified, 4 migrations; log (`public-catalog.log`, lưu cục bộ) |
| Đăng ký/login đúng và sai | PASS trên public; kiểm tra cookie Secure; log (`storefront.log`, lưu cục bộ) |
| Khách/admin, dashboard | PASS khách bị chặn API admin; admin vào dashboard; xác nhận qua trình duyệt |
| Đặt đơn, lịch sử, hủy, hoàn tồn | PASS API + đối chiếu Postgres; log (`storefront.log`, lưu cục bộ) |
| Hai đơn tranh mã giới hạn 1 lượt | PASS một 201, một 400, chỉ một redemption; log (`storefront.log`, lưu cục bộ) |
| Upload trực tiếp đúng 5.000.000 bytes | PASS upload, CORS, finalize, GET và bytes khớp; log (`direct-upload.log`, lưu cục bộ) |
| Ảnh quá 5 MB, MIME lạ, ảnh giả, token sửa | PASS bị từ chối; ảnh giả pending được dọn; log (`direct-upload.log`, lưu cục bộ) |
| Browser admin upload + lưu sản phẩm | PASS thông báo “Đã tải ảnh”, “Đã lưu món”; ảnh (`upload-ui.png`, lưu cục bộ) |
| Ảnh browser upload 5 MB qua redeploy | PASS DB reference, trang sản phẩm và bytes ảnh còn nguyên; log (`browser-persistence.log`, lưu cục bộ) |
| Persistence ảnh nhỏ | PASS API upload và trang sản phẩm sau redeploy; log (`persistence.log`, lưu cục bộ) |
| Stripe Checkout sandbox thực tế | PASS `complete paid livemode false`; DB order/payment paid, movement=1; log (`stripe-checkout.log`, lưu cục bộ), ảnh (`stripe-success.png`, lưu cục bộ) |
| Webhook chữ ký sai, success/duplicate/failure | PASS chữ ký sai 400; duplicate không cập nhật hai lần; log (`webhook.log`, lưu cục bộ) |
| Request đầu/lặp/8 đồng thời | 16/16 HTTP 200; log (`load.log`, lưu cục bộ) |
| Logs deployment cuối | Không có request HTTP >=500 trong cửa sổ kiểm thử; query summary (`final-server-errors.log`, lưu cục bộ) |
| Database/assets sau cleanup | 12 sản phẩm, 120 đơn, tiền/tồn/12 ảnh hợp lệ; log (`db-final.log`, lưu cục bộ) |

Output quan trọng:

```text
PASS direct browser upload: 5000000 bytes, CORS preflight, finalize validation, private media read with matching bytes
PASS oversized/unsupported/fake images and modified upload tokens rejected
PASS browser-uploaded 5 MB image, product reference and public product page survive redeploy
Stripe: complete paid livemode false
Database: { status: 'paid', payment_status: 'paid', movements: 1 }
PASS Vercel Checkout -> Stripe sandbox -> dedicated public webhook -> paid once
```

Bài storefront bỏ bài multipart lớn cũ vì payload Vercel 4,5 MB; ảnh 5 MB được kiểm tra qua luồng direct riêng và giao diện thật, không tính skip cũ thành PASS.

## Lỗi đã xử lý

- Cài CLI lần đầu chậm ở npm registry; retry đã thành công. Người dùng hoàn tất device login; xác minh team Hobby trước khi tạo project.
- Bulk API env trả Invalid JSON; chuyển sang CLI env add từng key với stdin, không in giá trị secret.
- Build local với `node --env-file` bị Next build worker từ chối NODE_OPTIONS; nạp dotenv ở tiến trình cha rồi spawn build, build thường và build Vercel đều đã PASS.
- CORS preflight trả `*`; flow upload không gửi cookie/credentials sang kho ảnh nên đây là response hợp lệ. Test đã phản ánh đúng điều kiện trình duyệt.
- Upload lớn ban đầu lỗi fetch ở bước finalize khi dùng FetchHttpHandler. Đổi sang S3 HTTP transport Node mặc định và Buffer; kiểm tra lại 5 MB trên public và browser đều PASS. Không còn 503 trong request logs của deployment cuối tại lúc nghiệm thu.
- Một lần khởi động server local mô phỏng biến Vercel bị automatic approval review chặn. Thay bằng kiểm thử runtime Vercel production thực tế; không dùng cách khác để chạy lại hành động bị chặn. Server local thông thường đã chạy lại cổng 3002.

## Miễn phí và giới hạn

Hobby dành cho demo/CV cá nhân, phi thương mại. Hạn mức hiện công bố gồm 4 giờ active CPU, 1 triệu function invocations, 100 GB fast data transfer; function Node với Fluid Compute có duration tối đa 300 giây. App đặt maxDuration 60 giây cho route handlers. Không còn dùng runtime Workers với budget CPU 10 ms/request cho link Vercel. Đây vẫn là quota hữu hạn, không phải cam kết dùng vô hạn.

[Hobby và điều kiện sử dụng](https://vercel.com/docs/plans/hobby), [Functions limits/payload 4,5 MB](https://vercel.com/docs/functions/limitations), [Pooling với Fluid Compute](https://vercel.com/kb/guide/connection-pooling-with-functions).

Neon vẫn ở Free với hạn mức riêng của Postgres, Object Storage, Functions và egress. Không thêm database hay kho trả phí. Cloudflare cũ và các endpoint Stripe cũ được giữ để có thể quay lại; không đụng endpoint local/ngrok. Link Vercel là link demo chính. Đăng nhập lại trên hostname mới; dữ liệu tài khoản/mật khẩu không đổi.

## Dọn thử và vận hành

Đã xóa sản phẩm VCQA-20261016, các sản phẩm/đơn/user thử do scripts tạo, ảnh direct pending/final do tests tạo, ảnh UI 5 MB và fixture local. Xóa đơn Stripe sandbox của lượt này, hoàn tồn, dọn Stripe customer test; giữ processed event để chặn redelivery. Lịch sử giao dịch test vẫn tồn tại trên Stripe. Server local http://127.0.0.1:3002 được giữ chạy.

Tái deploy: `npm run secrets:vercel` khi đổi env, `npm run build`, `npm run deploy:vercel`. Chi tiết trong README. Cấu hình project nằm ở vercel.json; credential local ở `.env.vercel.local`, không commit. IDs tài nguyên ở resources.json (`resources.json`, lưu cục bộ).







> Bản GitHub chỉ giữ ảnh/báo cáo đã rà soát; các log và tệp bằng chứng ghi là ‘lưu cục bộ’ không được công khai.
