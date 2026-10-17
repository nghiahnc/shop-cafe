import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { placeOrder, OrderError } from "@/modules/orders/service";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 }); }
  try {
    const order = await placeOrder(user, { ...(body as object), method: "cash" });
    return NextResponse.json({ code: order.code, orderId: order.orderId, total: order.total }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo đơn" }, { status: error instanceof OrderError ? error.status : 500 });
  }
}
