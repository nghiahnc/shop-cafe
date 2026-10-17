import "server-only";
import type Stripe from "stripe";

// Test-only fixture: use Stripe tokens instead of submitting raw card numbers.
// Stripe Checkout itself prefills the saved sandbox card.
export async function prepareDemoCustomer(stripe: Stripe, input: {
  orderId: string; shop: string; name: string; email: string;
}) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    throw new Error("Thẻ demo chỉ dùng với khóa Stripe test");
  }
  const prefix = `demo-${input.shop}-${input.orderId}`;
  const customer = await stripe.customers.create({
    name: input.name, email: input.email,
    metadata: { demo: "true", shop: input.shop, order_id: input.orderId },
  }, { idempotencyKey: `${prefix}-customer` });
  if (customer.livemode) throw new Error("Thẻ demo không hỗ trợ môi trường live");
  const method = await stripe.paymentMethods.create({
    type: "card", card: { token: "tok_visa" }, allow_redisplay: "always",
    billing_details: {
      name: input.name, email: input.email,
      address: { country: "VN", line1: "123 Duong Demo", city: "Ho Chi Minh" },
    },
  }, { idempotencyKey: `${prefix}-card` });
  await stripe.paymentMethods.attach(method.id, { customer: customer.id }, {
    idempotencyKey: `${prefix}-attach`,
  });
  await stripe.paymentMethods.update(method.id, {
    card: { exp_month: 12, exp_year: 2034 },
  }, { idempotencyKey: `${prefix}-expiry` });
  return customer.id;
}

export const demoCheckoutText = {
  submit: { message: "Đã điền sẵn thẻ demo Visa 4242. Chỉ cần bấm Thanh toán / Pay. Đây là sandbox, không phát sinh tiền thật." },
};
