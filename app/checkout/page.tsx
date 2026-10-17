import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import CheckoutForm from "@/modules/orders/ui/CheckoutForm";
import { requireUser } from "@/modules/auth/session";
import { listProducts } from "@/modules/catalog/repository";
export const dynamic = "force-dynamic";
export default async function CheckoutPage() { const [user,products] = await Promise.all([requireUser("/checkout"),listProducts()]); return <div className="storefront cafe-store"><StoreHeader user={user}/><CheckoutForm user={user} products={products} stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))} pickupAddress={process.env.SHOP_PICKUP_ADDRESS || "Quầy Nhà Cà Phê (địa chỉ demo)"}/></div>; }
