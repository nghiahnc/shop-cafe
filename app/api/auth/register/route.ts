import { NextResponse } from "next/server";
import { hashPassword, PasswordServiceError } from '@/lib/passwords';
import { z } from "zod";
import { createCredentialUser, findUserByEmail } from "@/modules/auth/repository";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  let data: z.infer<typeof schema>;
  try { data = schema.parse(await request.json()); }
  catch { return NextResponse.json({ error: "Tên, email hoặc mật khẩu không hợp lệ" }, { status: 400 }); }
  if (await findUserByEmail(data.email)) return NextResponse.json({ error: "Email đã được đăng ký" }, { status: 409 });
  try {
    const hash = await hashPassword(data.password);
    await createCredentialUser(data.name, data.email, hash);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof PasswordServiceError) return NextResponse.json({ error: "Dịch vụ mật khẩu tạm thời không khả dụng. Vui lòng thử lại." }, { status: 503 });
    if ((error as { code?: string })?.code === "23505") return NextResponse.json({ error: "Email đã được đăng ký" }, { status: 409 });
    return NextResponse.json({ error: "Không thể tạo tài khoản" }, { status: 500 });
  }
}
