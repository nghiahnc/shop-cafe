import Link from "next/link";
import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import { currentUser } from "@/modules/auth/session";
export default async function Placed({ searchParams }: { searchParams: Promise<{ code?: string }> }) { const [user,params] = await Promise.all([currentUser(),searchParams]); return <div className="storefront cafe-store"><StoreHeader user={user}/><main className="store-container"><div className="store-success"><span>☕</span><p className="store-overline">CẢM ƠN BẠN ĐÃ CHỌN NHÀ CÀ PHÊ</p><h1>Đơn hàng đã được ghi nhận.</h1><p>Mã đơn <b>{params.code ?? "—"}</b>. Quán sẽ chuẩn bị món và cập nhật tiến độ trong tài khoản của bạn.</p><div><Link className="store-primary-link" href="/account/orders">Theo dõi đơn hàng ↗</Link><Link href="/products">Tiếp tục xem thực đơn</Link></div></div></main></div>; }

