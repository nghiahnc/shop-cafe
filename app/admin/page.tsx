import { shop } from "@/lib/config";
import { getDashboard } from "@/lib/dashboard";
import { requireAdmin } from "@/modules/auth/session";
import Dashboard from "@/app/Dashboard";
export const dynamic = "force-dynamic";
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const days = [7,30,90].includes(Number(params.days)) ? Number(params.days) : 30;
  const data = await getDashboard(days);
  return <Dashboard data={data} days={days} shop={shop} stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))}/>;
}
