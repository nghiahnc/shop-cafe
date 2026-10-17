import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { upsertProduct, archiveProduct } from "@/modules/admin/product.service";

async function permitted() { return (await currentUser())?.role === "admin"; }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await permitted())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  try { await upsertProduct(await request.json(), id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Dữ liệu không hợp lệ" }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await permitted())) return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  return NextResponse.json({ ok: await archiveProduct(id) });
}
