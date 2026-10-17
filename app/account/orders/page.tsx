import Link from "next/link";
import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import OrdersView from "@/modules/orders/ui/OrdersView";
import { requireUser } from "@/modules/auth/session";
import { listOrdersForUser } from "@/modules/orders/service";
import { signOut } from "@/auth";
export const dynamic = "force-dynamic";
export default async function OrdersPage() { const user = await requireUser(); const orders = await listOrdersForUser(user.id); return <div className="storefront cafe-store"><StoreHeader user={user}/><main className="store-container"><div className="store-page-heading"><span className="store-overline">TÀI KHOẢN CỦA TÔI</span><h1>Đơn món của bạn<span>.</span></h1><p>{user.name} · {user.email}</p><form action={async () => { "use server"; await signOut({ redirectTo:"/" }); }}><button className="store-text-button">Đăng xuất</button></form></div><OrdersView orders={orders}/><Link href="/products">← Tiếp tục chọn món</Link></main></div>; }
