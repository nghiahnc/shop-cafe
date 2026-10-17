import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { advanceOrder, OrderError } from "@/modules/orders/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 403 });
  let body: { fulfillmentStatus?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 }); }
  try { await advanceOrder((await params).id, String(body.fulfillmentStatus)); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật" }, { status: error instanceof OrderError ? error.status : 500 }); }
}
