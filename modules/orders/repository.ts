import 'server-only';
import {getPool} from '@/lib/db';
import type {PoolClient} from 'pg';
import type {DrinkOptions} from '@/modules/cart/cart';
export type LockedProduct={id:number;name:string;price_vnd:number;image_path:string;stock:number;is_drink:boolean;serving:string;size_s_delta_vnd:number;size_l_delta_vnd:number};
export type PricedLine={product:LockedProduct;quantity:number;options:DrinkOptions|null;unitPrice:number};
export async function transaction<T>(work:(c:PoolClient)=>Promise<T>):Promise<T>{const c=await getPool().connect();try{await c.query('BEGIN');const out=await work(c);await c.query('COMMIT');return out;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function fetchProducts(c:PoolClient,ids:number[],lock:boolean):Promise<LockedProduct[]>{
  if(lock){const locked=await c.query(`SELECT id FROM products WHERE id=ANY($1::bigint[]) AND active=true ORDER BY id FOR UPDATE`,[ids]);if(locked.rowCount!==ids.length)throw new Error('Một món không còn bán');}
  const r=await c.query(`SELECT p.id::int,p.name,p.price_vnd::float8,p.image_path,
    COALESCE(o.is_drink,false) AS is_drink,COALESCE(d.serving,'') AS serving,
    COALESCE(o.size_s_delta_vnd,-5000)::float8 AS size_s_delta_vnd,COALESCE(o.size_l_delta_vnd,10000)::float8 AS size_l_delta_vnd,
    (p.opening_stock+COALESCE((SELECT SUM(quantity_delta) FROM inventory_movements WHERE product_id=p.id),0))::int AS stock
    FROM products p LEFT JOIN cafe_options o ON o.product_id=p.id LEFT JOIN cafe_product_details d ON d.product_id=p.id
    WHERE p.id=ANY($1::bigint[]) AND p.active=true ORDER BY p.id`,[ids]);
  if(r.rowCount!==ids.length)throw new Error('Một món không còn bán');return r.rows;
}
export async function insertOrder(c:PoolClient,input:{code:string;userId:string;email:string;name:string;phone:string;method:'cash'|'stripe';fulfillment:'delivery'|'pickup';address:string;city:string;note:string;subtotal:number;discount:number;promotionId:string|null;lines:PricedLine[]}){
  const customer=await c.query(`INSERT INTO customers(full_name,email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id`,[input.name,input.email]);
  const total=input.subtotal-input.discount;
  const source=input.method==='stripe'&&total>0?'stripe':'web';
  const order=await c.query(`INSERT INTO orders(code,user_id,customer_id,status,source,subtotal_vnd,discount_vnd,total_vnd,promotion_id,recipient_name,phone,address_line,city,delivery_note,fulfillment_method)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id::text`,
    [input.code,input.userId,customer.rows[0].id,total===0?'paid':'pending',source,input.subtotal,input.discount,total,input.promotionId,input.name,input.phone,input.fulfillment==='delivery'?input.address:null,input.fulfillment==='delivery'?input.city:null,input.note,input.fulfillment]);
  const orderId=order.rows[0].id as string;
  const quantities=new Map<number,number>();
  for(const line of input.lines){await c.query(`INSERT INTO order_items(order_id,product_id,product_name,unit_price_vnd,quantity,line_total_vnd,options) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [orderId,line.product.id,line.product.name,line.unitPrice,line.quantity,line.unitPrice*line.quantity,JSON.stringify(line.options??{})]);
    quantities.set(line.product.id,(quantities.get(line.product.id)??0)+line.quantity);
  }
  for(const [id,qty] of quantities) await c.query(`INSERT INTO inventory_movements(product_id,order_id,quantity_delta,reason) VALUES($1,$2,$3,$4)`,[id,orderId,-qty,total===0?'sale':'reserve']);
  const provider=total===0?'promo':input.method==='stripe'?'stripe':input.fulfillment==='pickup'?'pickup_cash':'cod';
  await c.query(`INSERT INTO payments(order_id,provider,status,amount_vnd,completed_at) VALUES($1,$2,$3,$4,$5)`,[orderId,provider,total===0?'paid':'pending',total,total===0?new Date():null]);
  if(input.promotionId)await c.query(`INSERT INTO promotion_redemptions(promotion_id,order_id) VALUES($1,$2)`,[input.promotionId,orderId]);
  return orderId;
}
export async function getOrderForUpdate(c:PoolClient,id:string){const r=await c.query(`SELECT o.id::text,o.user_id::text,o.status,o.fulfillment_status,o.fulfillment_method,p.provider,p.status AS payment_status,p.stripe_session_id FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=$1 FOR UPDATE OF o,p`,[id]);return r.rows[0]??null;}
export async function releaseOrder(c:PoolClient,id:string){await c.query(`INSERT INTO inventory_movements(product_id,order_id,quantity_delta,reason)
  SELECT product_id,order_id,-quantity_delta,'release' FROM inventory_movements WHERE order_id=$1 AND reason='reserve' ON CONFLICT(order_id,product_id,reason) DO NOTHING`,[id]);
  await c.query(`UPDATE orders SET status='cancelled',fulfillment_status='cancelled' WHERE id=$1`,[id]);
  await c.query(`UPDATE payments SET status='expired' WHERE order_id=$1 AND status='pending'`,[id]);
  await c.query(`DELETE FROM promotion_redemptions WHERE order_id=$1`,[id]);
}
export async function listOrdersForUser(userId:string){const r=await getPool().query(`SELECT o.id::text,o.code,o.status,o.fulfillment_status,o.fulfillment_method,o.total_vnd::float8,o.subtotal_vnd::float8,o.discount_vnd::float8,o.placed_at::text,p.provider,p.status AS payment_status,
  COALESCE(json_agg(json_build_object('name',i.product_name,'quantity',i.quantity,'price',i.unit_price_vnd::float8,'options',i.options)) FILTER(WHERE i.id IS NOT NULL),'[]') AS items
  FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id,p.id ORDER BY o.placed_at DESC`,[userId]);return r.rows;}
export async function listAdminOrders(){const r=await getPool().query(`SELECT o.id::text,o.code,o.status,o.fulfillment_status,o.fulfillment_method,o.total_vnd::float8,o.discount_vnd::float8,o.placed_at::text,o.recipient_name,o.phone,o.address_line,o.city,p.provider,p.status AS payment_status,
  COALESCE(c.full_name,'Khách lẻ') AS customer FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.placed_at DESC`);return r.rows;}
export async function advanceFulfillment(c:PoolClient,id:string,next:string,provider:string){
  if(next==='completed'&&['cod','pickup_cash'].includes(provider)){
    await c.query(`UPDATE inventory_movements SET reason='sale' WHERE order_id=$1 AND reason='reserve'`,[id]);
    await c.query(`UPDATE payments SET status='paid',completed_at=now() WHERE order_id=$1 AND status='pending'`,[id]);
    await c.query(`UPDATE orders SET status='paid' WHERE id=$1 AND status='pending'`,[id]);
  }
  await c.query(`UPDATE orders SET fulfillment_status=$1 WHERE id=$2`,[next,id]);
}
