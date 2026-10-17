import { randomUUID } from "node:crypto";
import StoreHeader from "@/modules/catalog/ui/StoreHeader";
import RegisterForm from "@/modules/auth/ui/RegisterForm";
import { currentUser } from "@/modules/auth/session";
import { redirect } from "next/navigation";
export default async function RegisterPage() { const user = await currentUser(); if (user) redirect("/account/orders"); return <div className="storefront cafe-store"><StoreHeader user={null}/><RegisterForm demoEmail={`demo-${randomUUID().slice(0,8)}@nhacaphe.local`}/></div>; }
