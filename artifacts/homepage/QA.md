# Kiểm tra trang chủ — 15/10/2026

## Kết quả

- `npm run build`: thành công, gồm TypeScript và toàn bộ route hiện có.
- Trình duyệt ở 375×812, 768×1024, 1024×900, 1440×900: không tràn ngang. Mobile dùng một cột, tablet/desktop dùng ba cột cho danh mục và sản phẩm.
- Tám ảnh trong nội dung tải thành công sau khi cuộn toàn trang; không có lỗi console trong phiên kiểm tra.
- Menu: mở đúng, focus vào nút đóng, Tab/Shift+Tab quay vòng trong menu, Escape đóng và trả focus về nút mở; cuộn nền được khóa và khôi phục.
- Menu Matcha dẫn tới `/products?category=matcha`, bộ lọc chọn đúng và hiển thị ba món Matcha.
- Thêm Espresso Nguyên Bản: giỏ từ 0 lên 1, có thông báo thành công. Sang giỏ và checkout giữ đúng size M, đá 0%, đường 100%, giá 39.000 ₫. Đã xóa món thử để giỏ trở về 0; không tạo đơn.
- Render component với tồn 0 và tồn 3: món hết hiển thị “Hết món” và khóa nút; món còn hàng cho phép thêm. Cả hai kiểm tra thành công, không sửa database.
- GET không có session: trang chủ hiển thị liên kết Đăng nhập. `/products`, bộ lọc Matcha, chi tiết món, `/login`, `/register` trả HTTP 200.
- Trang giỏ/checkout giữ header và giao diện cũ khi đi từ trang chủ mới; stylesheet mới chỉ dùng selector của CSS Module.
- Tương phản chữ thường trên nền kem: espresso 14,95:1, muted 5,43:1, nhãn/liên kết nâu 5,87:1. Đồng 4,28:1 chỉ dùng cho tiêu đề lớn, biểu tượng và focus; chữ nhỏ hover dùng nâu đậm.
- Đã kiểm tra mã cho reduced motion: CSS tắt chuyển động và bỏ trạng thái ẩn; Reveal không khởi tạo khi người dùng bật giảm chuyển động và hiển thị nội dung khi preference thay đổi. Không đổi thiết lập chuyển động của hệ điều hành trong quá trình QA.

## Ảnh nghiệm thu

- `desktop.jpg`, `desktop-full.jpg`: 1440×900, ảnh đầu trang và toàn trang.
- `mobile.jpg`, `mobile-full.jpg`: 375×812, ảnh đầu trang và toàn trang.
- Ảnh chụp từ dev server; biểu tượng Next.js Dev Tools chỉ xuất hiện trong môi trường phát triển.
