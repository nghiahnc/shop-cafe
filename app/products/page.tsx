import FilterDialog from '@/components/boutique/FilterDialog';
import Link from 'next/link';import StoreHeader from '@/modules/catalog/ui/StoreHeader';import ProductCard from '@/modules/catalog/ui/ProductCard';
import {listProducts,listCategories,listServings} from '@/modules/catalog/repository';import {currentUser} from '@/modules/auth/session';
export const dynamic='force-dynamic';
export default async function Products({searchParams}:{searchParams:Promise<{q?:string;category?:string;serving?:string}>}){const query=await searchParams;
  const [products,categories,servings,user]=await Promise.all([listProducts(query),listCategories(),listServings(),currentUser()]);
  return <div className="storefront cafe-store"><StoreHeader user={user}/><main className="store-container"><div className="store-page-heading"><span className="store-overline">NHÀ CÀ PHÊ / THỰC ĐƠN</span><h1>Tìm món hợp gu<span>.</span></h1><p>Cà phê, matcha và chút bánh ngọt cho hôm nay.</p></div>
    <FilterDialog><form className="store-filter" action="/products"><label>Tìm món<input type="search" name="q" defaultValue={query.q??''} placeholder="Tên món hoặc hương vị..."/></label><label>Danh mục<select name="category" defaultValue={query.category??''}><option value="">Tất cả</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></label><label>Cách dùng<select name="serving" defaultValue={query.serving??''}><option value="">Mọi loại</option>{servings.map(s=><option key={s}>{s}</option>)}</select></label><button>Tìm kiếm</button><Link href="/products">Xóa lọc</Link></form></FilterDialog>
    <div className="store-results"><b>{products.length} món</b><span>Đặt giao hoặc đến quán lấy ngay</span></div>{products.length?<div className="store-products">{products.map(p=><ProductCard product={p} key={p.id}/>)}</div>:<div className="store-empty"><h2>Chưa có món phù hợp</h2><p>Thử đổi từ khóa hoặc bộ lọc.</p><Link href="/products">Xem tất cả món →</Link></div>}</main></div>;
}
