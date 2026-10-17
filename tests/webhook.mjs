import './network.mjs';
import { config } from 'dotenv';
import pg from 'pg';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';

config({ path: '.env.local' });
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3102';
const secret = process.env.TEST_STRIPE_WEBHOOK_SECRET ?? 'whsec_integration_test';
const stripe = new Stripe('sk_test_integration_test');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const ids = [];
const eventIds = [];
const email = `webhook-${randomUUID()}@example.test`;
let customerId;

async function makeOrder(label) {
  const product = (await db.query('SELECT id,name,price_vnd FROM products WHERE id=1')).rows[0];
  const code = `TEST-${label}-${randomUUID().slice(0,8)}`;
  const order = (await db.query(`INSERT INTO orders(code,customer_id,status,source,subtotal_vnd,total_vnd) VALUES($1,$2,'pending','stripe',$3,$3) RETURNING id`, [code,customerId,product.price_vnd])).rows[0];
  ids.push(order.id);
  await db.query(`INSERT INTO order_items(order_id,product_id,product_name,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,1,$4)`, [order.id,product.id,product.name,product.price_vnd]);
  const sessionId = `cs_test_${randomUUID().replaceAll('-','')}`;
  await db.query(`INSERT INTO payments(order_id,provider,status,amount_vnd,charge_currency,charge_amount,stripe_session_id) VALUES($1,'stripe','pending',$2,'VND',$2,$3)`, [order.id,product.price_vnd,sessionId]);
  return { orderId: order.id, sessionId, amount: Number(product.price_vnd) };
}

async function sendEvent(order, type, eventId, signed = true) {
  const payload = JSON.stringify({ id:eventId, object:'event', type, data:{ object:{ id:order.sessionId, object:'checkout.session', metadata:{order_id:String(order.orderId)}, amount_total:order.amount, currency:'vnd', payment_status:type==='checkout.session.completed'?'paid':'unpaid', payment_intent:'pi_test_webhook' } } });
  const signature = signed ? stripe.webhooks.generateTestHeaderString({payload,secret}) : 'invalid';
  const response = await fetch(`${base}/api/stripe/webhook`, { method:'POST', headers:{'content-type':'application/json','stripe-signature':signature}, body:payload });
  return { status:response.status, body:await response.json() };
}

try {
  customerId = (await db.query('INSERT INTO customers(full_name,email) VALUES($1,$2) RETURNING id',['Webhook Test',email])).rows[0].id;
  const paid = await makeOrder('paid');
  const paidEvent = `evt_test_${randomUUID().replaceAll('-','')}`;
  eventIds.push(paidEvent);
  const invalid = await sendEvent(paid,'checkout.session.completed',paidEvent,false);
  if (invalid.status !== 400) throw new Error(`Expected invalid signature 400; got ${invalid.status}`);
  const first = await sendEvent(paid,'checkout.session.completed',paidEvent);
  if (first.status !== 200) throw new Error(`Paid webhook failed: ${JSON.stringify(first)}`);
  const second = await sendEvent(paid,'checkout.session.completed',paidEvent);
  if (second.status !== 200 || !second.body.duplicate) throw new Error('Duplicate event was not ignored');
  const paidResult = (await db.query(`SELECT o.status AS order_status,p.status AS payment_status,
    (SELECT COUNT(*)::int FROM inventory_movements WHERE order_id=o.id) AS movements
    FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=$1`,[paid.orderId])).rows[0];
  if (paidResult.order_status !== 'paid' || paidResult.payment_status !== 'paid' || paidResult.movements !== 1) throw new Error(`Paid state incorrect: ${JSON.stringify(paidResult)}`);

  const failed = await makeOrder('failed');
  const failedEvent = `evt_test_${randomUUID().replaceAll('-','')}`;
  eventIds.push(failedEvent);
  const failure = await sendEvent(failed,'checkout.session.async_payment_failed',failedEvent);
  if (failure.status !== 200) throw new Error(`Failed webhook failed: ${JSON.stringify(failure)}`);
  const failedResult = (await db.query(`SELECT o.status AS order_status,p.status AS payment_status FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=$1`,[failed.orderId])).rows[0];
  if (failedResult.order_status !== 'cancelled' || failedResult.payment_status !== 'failed') throw new Error(`Failure state incorrect: ${JSON.stringify(failedResult)}`);
  console.log('Webhook: chữ ký sai bị từ chối; thành công cập nhật một lần; lặp bỏ qua; thất bại hủy đơn.');
} finally {
  for (const id of ids) await db.query('DELETE FROM inventory_movements WHERE order_id=$1',[id]);
  for (const eventId of eventIds) await db.query('DELETE FROM stripe_events WHERE id=$1',[eventId]);
  for (const id of ids) await db.query('DELETE FROM orders WHERE id=$1',[id]);
  if (customerId) await db.query('DELETE FROM customers WHERE id=$1',[customerId]);
  await db.end();
}
