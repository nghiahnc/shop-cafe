import "server-only";
import type Stripe from "stripe";
import { transaction } from "@/modules/orders/repository";

export async function recordStripeEvent(event: Stripe.Event, session: Stripe.Checkout.Session) {
  return transaction(async (client) => {
    const inserted = await client.query(`INSERT INTO stripe_events(id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`, [event.id,event.type]);
    if (!inserted.rowCount) return { duplicate:true };
    const payment = await client.query(`SELECT p.order_id::text,p.status,p.charge_amount,p.charge_currency,o.status AS order_status
      FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.stripe_session_id=$1 FOR UPDATE OF p,o`, [session.id]);
    if (!payment.rowCount || payment.rows[0].order_id !== session.metadata?.order_id) throw new Error("Không tìm thấy đơn tương ứng với phiên Stripe");
    const row = payment.rows[0];
    if (Number(row.charge_amount) !== session.amount_total || String(row.charge_currency).toLowerCase() !== session.currency) throw new Error("Số tiền Stripe không khớp đơn hàng");
    const paid = event.type === "checkout.session.async_payment_succeeded" || (event.type === "checkout.session.completed" && session.payment_status === "paid");
    if (paid && row.status !== "paid") {
      if (row.order_status === "cancelled") {
        await client.query(`UPDATE payments SET status='paid',completed_at=now() WHERE order_id=$1`, [row.order_id]);
        await client.query(`UPDATE orders SET status='needs_review' WHERE id=$1`, [row.order_id]);
        return { duplicate:false };
      }
      const reservations = await client.query(`SELECT product_id FROM inventory_movements WHERE order_id=$1 AND reason='reserve'`, [row.order_id]);
      let enoughStock = true;
      if (reservations.rowCount) {
        await client.query(`UPDATE inventory_movements SET reason='sale' WHERE order_id=$1 AND reason='reserve'`, [row.order_id]);
      } else {
        // Legacy test orders created before the storefront reservation migration.
        const items = await client.query(`SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id`, [row.order_id]);
        for (const item of items.rows) {
          await client.query(`SELECT id FROM products WHERE id=$1 FOR UPDATE`, [item.product_id]);
          const stock = await client.query(`SELECT (p.opening_stock+COALESCE(SUM(m.quantity_delta),0))::int AS available
            FROM products p LEFT JOIN inventory_movements m ON m.product_id=p.id WHERE p.id=$1 GROUP BY p.id`, [item.product_id]);
          if (!stock.rowCount || Number(stock.rows[0].available) < Number(item.quantity)) enoughStock = false;
        }
        if (enoughStock) for (const item of items.rows) await client.query(`INSERT INTO inventory_movements(product_id,order_id,quantity_delta,reason)
          VALUES($1,$2,$3,'sale') ON CONFLICT(order_id,product_id,reason) DO NOTHING`, [item.product_id,row.order_id,-Number(item.quantity)]);
      }
      await client.query(`UPDATE payments SET status='paid',stripe_payment_intent_id=$1,completed_at=now() WHERE order_id=$2`, [typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,row.order_id]);
      await client.query(`UPDATE orders SET status=$1 WHERE id=$2`, [enoughStock ? "paid" : "needs_review",row.order_id]);
    } else if ((event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") && row.status === "pending") {
      await client.query(`INSERT INTO inventory_movements(product_id,order_id,quantity_delta,reason)
        SELECT product_id,order_id,-quantity_delta,'release' FROM inventory_movements WHERE order_id=$1 AND reason='reserve'
        ON CONFLICT(order_id,product_id,reason) DO NOTHING`, [row.order_id]);
      await client.query(`UPDATE payments SET status=$1 WHERE order_id=$2`, [event.type === "checkout.session.expired" ? "expired" : "failed",row.order_id]);
      await client.query(`UPDATE orders SET status='cancelled',fulfillment_status='cancelled' WHERE id=$1`, [row.order_id]);
      await client.query(`DELETE FROM promotion_redemptions WHERE order_id=$1`,[row.order_id]);
    }
    return { duplicate:false };
  });
}
