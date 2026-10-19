# Nhà Cà Phê — nghiệm thu giao diện 19/10/2026

## Thay đổi

- Tham khảo bố cục [Louis Vuitton Việt Nam](https://vn.louisvuitton.com/vie-vn/homepage): header giữa, banner tràn ngang, danh mục, ảnh bộ sưu tập, sản phẩm tuyển chọn, câu chuyện và footer.
- Thống nhất giao diện khách hàng từ trang chủ đến catalog, chi tiết, giỏ, checkout, đăng nhập/đăng ký và lịch sử đơn; header/footer dùng chung trong dự án.
- Menu, tìm kiếm và bộ lọc dùng native dialog; chuyển trạng thái header theo cuộn; bộ lọc giữ GET và tham số hiện có.
- Dùng Next Image trên các ảnh cửa hàng; ảnh đầu trang preload, ảnh còn lại lazy; bổ sung hai ảnh editorial với nguồn tại ASSET_SOURCES.md.
- Giỏ/checkout có trạng thái khôi phục dữ liệu trước khi hiện giỏ trống. Giữ giao diện quản trị, API, schema và định dạng giỏ hàng.

## Kiểm thử đã thực hiện

- `npm run build`: PASS, gồm TypeScript và toàn bộ route.
- Browser với viewport được xác nhận thực tế: 375×812, 768×900, 1024×900, 1440×900. Kiểm tra trang chủ, danh sách, chi tiết, giỏ trống, đăng nhập và đăng ký; không tràn ngang, không chồng header, không ảnh lỗi, mỗi trang có một h1 sau khi tải.
- Checkout với giỏ có sản phẩm: PASS ở bốn chiều rộng trên, không tràn ngang.
- Bộ lọc danh mục và tìm kiếm không có kết quả: PASS; tham số URL và kết quả đúng. Danh mục hoa hồng trả 2 sản phẩm, Matcha 3 món, phụ kiện thời trang 2 sản phẩm trong bộ dữ liệu thử tương ứng.
- Menu: focus ban đầu ở nút đóng, Escape đóng và trả focus về nút menu, khóa/khôi phục cuộn nền. Native dialog và trap Tab/Shift+Tab giới hạn focus bên trong.
- API trên database thử: route công khai, đăng nhập đúng/sai, phân quyền khách/quản trị, checkout/lịch sử, đơn nhiều sản phẩm, hủy và hoàn tồn kho đều PASS. Trang admin trả 200 và không có boutique frame.
- Đã chọn Latte size L, đá 50%, đường 30%, số lượng 2. Giỏ giữ đúng tùy chọn; áp CAFE10 giảm 10%, chọn nhận tại quán, đặt và hủy đơn qua UI. API xác nhận tùy chọn lưu trong đơn và hoàn tồn kho.
- Các thay đổi không sửa endpoint, schema, Stripe/webhook hoặc mã nghiệp vụ quản trị. Không chạy migration/seed hay đặt/hủy đơn trên production trong đợt QA này.
- Reduced motion được kiểm tra trong source CSS; không thay thiết lập hệ điều hành. Không thực hiện lại thanh toán Stripe trong đợt chỉnh UI; giữ luồng sandbox đang cấu hình trên website.

## Môi trường và bằng chứng

- Build production chạy bằng Next start tại localhost:3101/3102/3103, tương ứng ba database PostgreSQL thử riêng `boutique_qa_*_20261019` trên 127.0.0.1.
- Credentials và log kiểm thử nằm ngoài Git. Các đơn thử qua UI đã hủy; fixture API đã dọn trong database thử.
- `desktop.jpg`: trang chủ 1440×900; `mobile.jpg`: trang chủ 375×812. Ảnh chụp catalog/chi tiết/checkout và JSON kiểm thử bổ sung lưu cục bộ, không commit.
- Kết quả tổng hợp của ba shop: 72 tổ hợp trang/kích thước và 12 kiểm tra checkout có sản phẩm đều không tràn ngang.
