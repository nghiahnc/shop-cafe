import AdminShell from "@/modules/admin/ui/AdminShell";
import AdminOrders from "@/modules/admin/ui/AdminOrders";
import { requireAdmin } from "@/modules/auth/session";
import { listAdminOrders } from "@/modules/orders/service";
export const dynamic = "force-dynamic";
export default async function AdminOrdersPage() { await requireAdmin(); const orders = await listAdminOrders(); return <AdminShell title="Đơn hàng"><div className="page-heading"><div><span className="eyebrow">XỬ LÝ ĐƠN CÀ PHÊ</span><h1>Đơn hàng.</h1><p>Theo dõi pha chế và cập nhật cách nhận món.</p></div></div><AdminOrders orders={orders}/></AdminShell>; }
