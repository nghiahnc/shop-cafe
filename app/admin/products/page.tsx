import AdminShell from "@/modules/admin/ui/AdminShell";
import AdminProducts from "@/modules/admin/ui/AdminProducts";
import { requireAdmin } from "@/modules/auth/session";
import { listProducts,listCategories } from "@/modules/catalog/repository";
export const dynamic = "force-dynamic";
export default async function AdminProductsPage() { await requireAdmin(); const [products,categories] = await Promise.all([listProducts({ includeInactive:true }),listCategories()]); return <AdminShell title="Sản phẩm & kho"><div className="page-heading"><div><span className="eyebrow">DANH MỤC NHÀ CÀ PHÊ</span><h1>Sản phẩm & tồn kho.</h1><p>Tạo, sửa, ẩn sản phẩm và điều chỉnh số lượng thực tế.</p></div></div><AdminProducts products={products} categories={categories}/></AdminShell>; }
