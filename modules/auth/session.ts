import "server-only";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type CurrentUser = { id: string; email: string; name: string; role: "customer" | "admin" };

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string | null; email?: string | null } | undefined;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, name: user.name ?? "Khách hàng", role: user.role === "admin" ? "admin" : "customer" };
}

export async function requireUser(next = "/account/orders") {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
