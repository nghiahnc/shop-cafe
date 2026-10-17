import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordStripeEvent } from "@/modules/payments/repository";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!key?.startsWith("sk_test_") || !secret?.startsWith("whsec_")) return NextResponse.json({ error: "Webhook chưa cấu hình" }, { status: 503 });
  if (!signature) return NextResponse.json({ error: "Thiếu Stripe-Signature" }, { status: 400 });
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(await request.text(),signature,secret,undefined,Stripe.createSubtleCryptoProvider()); }
  catch { return NextResponse.json({ error: "Chữ ký webhook không hợp lệ" }, { status: 400 }); }
  const handled = ["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired"];
  if (!handled.includes(event.type)) return NextResponse.json({ received:true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.shop && session.metadata.shop !== "CF") return NextResponse.json({ received:true,ignored:true });
  try { const result = await recordStripeEvent(event,session); return NextResponse.json({ received:true,...result }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Xử lý webhook thất bại" }, { status: 500 }); }
}
