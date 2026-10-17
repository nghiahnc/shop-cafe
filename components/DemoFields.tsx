"use client";
import { useState, type ReactNode } from "react";
import { demo } from "@/lib/demo";

export function DemoNote({ children }: { children: ReactNode }) {
  return <div className="demo-note" role="note"><strong>Đã điền sẵn dữ liệu demo</strong><p>{children}</p></div>;
}

export function DemoLoginFields() {
  const [email, setEmail] = useState<string>(demo.customerEmail);
  const [password, setPassword] = useState("Demo1234!");
  function select(role: "customer" | "admin") {
    setEmail(role === "admin" ? demo.adminEmail : demo.customerEmail);
    setPassword(role === "admin" ? "Admin1234!" : "Demo1234!");
  }
  return <>
    <DemoNote>Tài khoản khách và mật khẩu đã sẵn sàng. Chỉ cần bấm Đăng nhập, hoặc chọn Quản trị demo để xem trang quản lý.</DemoNote>
    <div className="demo-actions" aria-label="Chọn tài khoản demo">
      <button type="button" aria-pressed={email === demo.customerEmail} onClick={() => select("customer")}>Khách demo</button>
      <button type="button" aria-pressed={email === demo.adminEmail} onClick={() => select("admin")}>Quản trị demo</button>
    </div>
    <label>Email<input name="email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}/></label>
    <label>Mật khẩu<input name="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label>
  </>;
}

export function DemoRegistrationFields({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  return <>
    <DemoNote>Họ tên, email mới và mật khẩu đã điền sẵn. Bấm Đăng ký để tạo tài khoản thật trong bản demo; email được tạo mới mỗi lần mở trang để tránh trùng.</DemoNote>
    <label>Họ và tên<input name="name" required minLength={2} maxLength={100} defaultValue={demo.name} autoComplete="name"/></label>
    <label>Email<input name="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label>
    <label>Mật khẩu<input name="password" type="password" required minLength={8} maxLength={72} defaultValue="Demo1234!" autoComplete="new-password"/></label>
  </>;
}

export function DemoCardNote() {
  return <div className="demo-card">
    <DemoNote>Thẻ test Visa đã chuẩn bị sẵn trên Stripe. Mở Checkout và bấm Pay / Thanh toán; không cần gõ thông tin thẻ, không phát sinh tiền thật.</DemoNote>
    <div className="demo-card-details"><span>Số thẻ demo <code>4242 4242 4242 4242</code></span><span>Hết hạn <code>12/34</code></span><span>CVC mẫu <code>123</code></span></div>
    <p>Stripe hiển thị thẻ đã lưu dưới dạng •••• 4242. Với thẻ này, bạn không cần nhập lại CVC.</p>
  </div>;
}
