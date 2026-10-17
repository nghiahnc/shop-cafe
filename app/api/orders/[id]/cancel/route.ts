import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { cancelOrder, OrderError } from "@/modules/orders/service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  try { await cancelOrder((await params).id, user); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể hủy đơn" }, { status: error instanceof OrderError ? error.status : 500 }); }
}
