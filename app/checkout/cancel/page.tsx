import Link from "next/link";
import { shop } from "@/lib/config";

export default function Cancel() { return <main className="setup-screen"><div className="setup-card"><span className="brand-mark">{shop.initials}</span><p className="eyebrow">STRIPE SANDBOX</p><h1>Checkout chưa hoàn tất</h1><p>Chưa có khoản thanh toán nào được ghi nhận. Phiên thanh toán sẽ hết hạn theo Stripe; bạn có thể quay lại cửa hàng.</p><Link href="/products">← Trở về cửa hàng</Link></div></main>; }
