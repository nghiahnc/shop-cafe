import Link from "next/link";
import { shop } from "@/lib/config";

export default function Success() { return <main className="setup-screen"><div className="setup-card"><span className="brand-mark">{shop.initials}</span><p className="eyebrow">STRIPE SANDBOX</p><h1>Đã hoàn tất Checkout</h1><p>Stripe đã chuyển bạn về {shop.name}. Webhook sẽ xác nhận thanh toán và cập nhật đơn trong PostgreSQL. Bạn có thể xem trạng thái trong tài khoản sau vài giây.</p><Link href="/account/orders">← Xem đơn của tôi</Link></div></main>; }
