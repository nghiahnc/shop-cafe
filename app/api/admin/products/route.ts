import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { upsertProduct } from "@/modules/admin/product.service";

export async function POST(request: Request) {
  if ((await currentUser())?.role !== "admin") return NextResponse.json({ error: "Không có quyền quản trị" }, { status: 403 });
  try { const id = await upsertProduct(await request.json()); return NextResponse.json({ id }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Dữ liệu không hợp lệ" }, { status: 400 }); }
}
