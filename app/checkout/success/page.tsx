import StoreHeader from '@/modules/catalog/ui/StoreHeader';
import Link from "next/link";
import { shop } from "@/lib/config";

export default function Success() { return <><StoreHeader/><main className="setup-screen"><div className="setup-card"><span className="brand-mark">{shop.initials}</span><p className="eyebrow">STRIPE SANDBOX</p><h1>Đã hoàn tất Checkout</h1><p>Stripe đã chuyển bạn về {shop.name}. Bạn có thể theo dõi trạng thái thanh toán và giao hàng trong tài khoản của mình.</p><Link href="/account/orders">← Xem đơn của tôi</Link></div></main></>; }
