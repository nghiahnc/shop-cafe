import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import CartView from "@/modules/cart/ui/CartView";
import { listProducts } from "@/modules/catalog/repository";
import { currentUser } from "@/modules/auth/session";
export const dynamic = "force-dynamic";
export default async function CartPage() { const [products,user] = await Promise.all([listProducts(),currentUser()]); return <div className="storefront cafe-store"><StoreHeader user={user}/><CartView products={products}/></div>; }
