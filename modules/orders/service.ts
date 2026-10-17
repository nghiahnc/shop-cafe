import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {getPool} from '@/lib/db';
import type {CurrentUser} from '@/modules/auth/session';
import type {DrinkOptions} from '@/modules/cart/cart';
import {selectPromotion} from '@/modules/promotions/service';
import {transaction,fetchProducts,insertOrder,getOrderForUpdate,releaseOrder,advanceFulfillment,listOrdersForUser,listAdminOrders,type LockedProduct,type PricedLine} from '@/modules/orders/repository';

const optionSchema=z.object({size:z.enum(['S','M','L']),ice:z.union([z.literal(0),z.literal(50),z.literal(100)]),sugar:z.union([z.literal(0),z.literal(30),z.literal(50),z.literal(100)])});
const cartSchema=z.object({items:z.array(z.object({productId:z.number().int().positive(),quantity:z.number().int().min(1).max(20),options:optionSchema.nullable().optional()})).min(1).max(30),promoCode:z.string().trim().max(30).optional()});
const orderSchema=cartSchema.extend({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^[0-9+(). -]{9,20}$/),
  fulfillment:z.enum(['delivery','pickup']),address:z.string().trim().max(250).default(''),city:z.string().trim().max(100).default(''),note:z.string().trim().max(500).default(''),method:z.enum(['cash','stripe'])});
export class OrderError extends Error{constructor(message:string,public status=400){super(message);}}
function priceLines(items:z.infer<typeof cartSchema>['items'],products:LockedProduct[]){
  const byId=new Map(products.map(p=>[p.id,p]));const lines:PricedLine[]=[];const amounts=new Map<number,number>();
  for(const item of items){const product=byId.get(item.productId);if(!product)throw new OrderError('Một món không còn bán',404);
    const options:DrinkOptions|null=product.is_drink?(item.options??{size:'M',ice:product.serving==='Nóng'?0:100,sugar:100}):null;
    if(product.is_drink&&product.serving==='Nóng'&&options?.ice!==0)throw new OrderError('Món nóng không có đá');
    const unitPrice=product.price_vnd+(options?.size==='S'?product.size_s_delta_vnd:options?.size==='L'?product.size_l_delta_vnd:0);
    if(!Number.isSafeInteger(unitPrice)||unitPrice<=0)throw new OrderError('Giá biến thể không hợp lệ');
    lines.push({product,quantity:item.quantity,options,unitPrice});amounts.set(product.id,(amounts.get(product.id)??0)+item.quantity);
  }
  if([...amounts].some(([id,qty])=>qty>20||qty>(byId.get(id)?.stock??0)))throw new OrderError('Một món không đủ tồn kho',409);
  const subtotal=lines.reduce((sum,l)=>sum+l.unitPrice*l.quantity,0);if(!Number.isSafeInteger(subtotal))throw new OrderError('Giá trị đơn hàng không hợp lệ');
  return {lines,subtotal};
}
export async function quoteOrder(raw:unknown){const parsed=cartSchema.safeParse(raw);if(!parsed.success)throw new OrderError('Giỏ hàng không hợp lệ');
  const c=await getPool().connect();try{const ids=[...new Set(parsed.data.items.map(x=>x.productId))].sort((a,b)=>a-b);
    const priced=priceLines(parsed.data.items,await fetchProducts(c,ids,false));
    const promo=await selectPromotion(c,priced.subtotal,parsed.data.promoCode);
    return {subtotal:priced.subtotal,discount:promo?.discount??0,total:priced.subtotal-(promo?.discount??0),promotion:promo&&{name:promo.name,code:promo.code},lines:priced.lines.map(l=>({productId:l.product.id,unitPrice:l.unitPrice,quantity:l.quantity,options:l.options}))};
  }finally{c.release();}}
export async function placeOrder(user:CurrentUser,raw:unknown){const parsed=orderSchema.safeParse(raw);if(!parsed.success)throw new OrderError('Thông tin đơn hàng chưa hợp lệ');const d=parsed.data;
  if(d.fulfillment==='delivery'&&(d.address.length<5||d.city.length<2))throw new OrderError('Vui lòng nhập địa chỉ giao hàng');
  return transaction(async c=>{const ids=[...new Set(d.items.map(x=>x.productId))].sort((a,b)=>a-b);
    const priced=priceLines(d.items,await fetchProducts(c,ids,true));
    let promo;try{promo=await selectPromotion(c,priced.subtotal,d.promoCode,true);}catch(e){throw new OrderError(e instanceof Error?e.message:'Mã ưu đãi không hợp lệ');}
    const code=`CF-${randomUUID().slice(0,8).toUpperCase()}`;
    const orderId=await insertOrder(c,{code,userId:user.id,email:user.email,name:d.name,phone:d.phone,method:d.method,fulfillment:d.fulfillment,address:d.address,city:d.city,note:d.note,
      subtotal:priced.subtotal,discount:promo?.discount??0,promotionId:promo?.id??null,lines:priced.lines});
    return {orderId,code,subtotal:priced.subtotal,discount:promo?.discount??0,total:priced.subtotal-(promo?.discount??0),lines:priced.lines,method:d.method};
  });}
export async function cancelOrder(id:string,user:CurrentUser){return transaction(async c=>{const o=await getOrderForUpdate(c,id);
  if(!o||(user.role!=='admin'&&o.user_id!==user.id))throw new OrderError('Không tìm thấy đơn',404);
  if(!['cod','pickup_cash'].includes(o.provider)||o.status!=='pending'||!['new','confirmed'].includes(o.fulfillment_status))throw new OrderError('Đơn không thể hủy lúc này',409);
  await releaseOrder(c,id);});}
export async function abortStripeOrder(id:string){return transaction(async c=>{const o=await getOrderForUpdate(c,id);if(!o||o.provider!=='stripe'||o.status!=='pending')return;await releaseOrder(c,id);await c.query(`UPDATE payments SET status='failed' WHERE order_id=$1`,[id]);});}
export async function advanceOrder(id:string,next:string){return transaction(async c=>{const o=await getOrderForUpdate(c,id);if(!o)throw new OrderError('Không tìm thấy đơn',404);
  if(['cancelled','needs_review'].includes(o.status))throw new OrderError('Đơn không thể xử lý',409);
  const sequence=o.fulfillment_method==='pickup'?['new','confirmed','preparing','ready','completed']:['new','confirmed','preparing','shipping','completed'];
  if(next==='cancelled'){if(!['cod','pickup_cash'].includes(o.provider)||o.status!=='pending'||!['new','confirmed'].includes(o.fulfillment_status))throw new OrderError('Không thể hủy đơn',409);await releaseOrder(c,id);return;}
  if(sequence.indexOf(next)!==sequence.indexOf(o.fulfillment_status)+1)throw new OrderError('Bước xử lý không hợp lệ',409);
  if(next==='completed'&&o.provider==='stripe'&&o.payment_status!=='paid')throw new OrderError('Chưa thanh toán Stripe',409);
  await advanceFulfillment(c,id,next,o.provider);});}
export {listOrdersForUser,listAdminOrders};
