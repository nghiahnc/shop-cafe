"use client";
import useReady from '@/components/boutique/useReady';
import Image from 'next/image';
import Link from "next/link";
import { DemoRegistrationFields } from "@/components/DemoFields";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
export default function RegisterForm({ demoEmail }: { demoEmail: string }) {
  const ready = useReady();
  const router = useRouter(); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget);
    const body = { name:String(data.get("name")),email:String(data.get("email")),password:String(data.get("password")) };
    try { const response = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); const login = await signIn("credentials", { email:body.email,password:body.password,redirect:false }); if (login?.error) throw new Error("Tài khoản đã tạo. Vui lòng đăng nhập."); router.push("/account/orders"); router.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể đăng ký"); setBusy(false); }
  }
  return <main className="store-auth-shell"><div className="store-auth-image"><Image width={900} height={1100} sizes="(max-width: 767px) 50vw, 33vw" src="/images/product-05.jpg" alt="Cà phê"/><div><span>✿</span><h2>Một tài khoản nhỏ,<br/>nhiều khoảnh khắc đẹp.</h2></div></div><div className="store-auth-card"><span className="store-overline">BẮT ĐẦU CÙNG NHÀ CÀ PHÊ</span><h1>Tạo tài khoản</h1><p>Đăng ký để đặt món và theo dõi đơn hàng của bạn.</p><form onSubmit={submit}><DemoRegistrationFields initialEmail={demoEmail}/><button className="store-primary-link" disabled={busy || !ready}>{busy ? "Đang tạo tài khoản..." : "Đăng ký ↗"}</button>{error && <p className="store-error" role="alert">{error}</p>}</form><p>Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p></div></main>;
}
