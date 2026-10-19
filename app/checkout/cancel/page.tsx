import StoreHeader from '@/modules/catalog/ui/StoreHeader';
import Link from "next/link";
import { shop } from "@/lib/config";

export default function Cancel() { return <><StoreHeader/><main className="setup-screen"><div className="setup-card"><span className="brand-mark">{shop.initials}</span><p className="eyebrow">STRIPE SANDBOX</p><h1>Checkout chưa hoàn tất</h1><p>Chưa có khoản thanh toán nào được ghi nhận. Bạn có thể quay lại giỏ hàng và tiếp tục khi sẵn sàng.</p><Link href="/products">← Trở về cửa hàng</Link></div></main></>; }
