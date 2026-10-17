import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import LoginForm from "@/modules/auth/ui/LoginForm";
import { currentUser } from "@/modules/auth/session";
import { redirect } from "next/navigation";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user,params] = await Promise.all([currentUser(),searchParams]);
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account/orders";
  if (user) redirect(user.role === "admin" ? "/admin" : next);
  return <div className="storefront cafe-store"><StoreHeader user={null}/><LoginForm next={next} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}/></div>;
}
