import {NextRequest,NextResponse} from 'next/server';
import Stripe from 'stripe';
import { prepareDemoCustomer, demoCheckoutText } from "@/lib/stripe-demo";
import {currentUser} from '@/modules/auth/session';
import {placeOrder,abortStripeOrder,OrderError} from '@/modules/orders/service';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
function currencyError(e:unknown){const x=e as {code?:string;param?:string;message?:string};return x?.code==='invalid_currency'||Boolean(x?.param?.includes('currency'))||/currency.*(unsupported|invalid)/i.test(x?.message??'');}
export async function POST(req:NextRequest){const user=await currentUser();if(!user)return NextResponse.json({error:'Vui lòng đăng nhập'},{status:401});
  const key=process.env.STRIPE_SECRET_KEY;if(!key?.startsWith('sk_test_'))return NextResponse.json({error:'Chưa cấu hình Stripe sandbox; hãy chọn thanh toán tiền mặt'},{status:503});
  let body:Record<string,unknown>;try{body=await req.json();}catch{return NextResponse.json({error:'JSON không hợp lệ'},{status:400});}
  if(!body.items&&body.productId)body={items:[{productId:Number(body.productId),quantity:Number(body.quantity),options:null}],name:String(body.customerName??user.name),phone:'0900000000',fulfillment:'pickup',address:'',city:'',note:'Đơn thử admin',method:'stripe'};
  let order:Awaited<ReturnType<typeof placeOrder>>;try{order=await placeOrder(user,{...body,method:'stripe'});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Không thể tạo đơn'},{status:e instanceof OrderError?e.status:500});}
  if(order.total===0)return NextResponse.json({code:order.code,free:true});
  const email=user.email; const demoName=String(body.name ?? user.name);
  const stripe=new Stripe(key,{httpClient:Stripe.createFetchHttpClient()}),rate=Number(process.env.DEMO_VND_PER_USD??'26000'),preferred=process.env.STRIPE_CHECKOUT_CURRENCY?.toUpperCase()==='USD'?'USD':'VND',origin=req.nextUrl.origin;
  let demoCustomer: string | undefined;
  async function session(currency:'USD'|'VND'){
    demoCustomer ??= await prepareDemoCustomer(stripe, { orderId: order.orderId, shop: "CF", name: demoName, email: email });
    if(currency==='USD'&&(!Number.isSafeInteger(rate)||rate<1))throw new Error('Tỷ giá demo không hợp lệ');
    const amount=currency==='USD'?Math.max(1,Math.round(order.total/rate*100)):order.total;
    return stripe.checkout.sessions.create({mode:'payment',allowed_payment_method_types:['card'],
      line_items:[{price_data:{currency:currency.toLowerCase(),unit_amount:amount,product_data:{name:`Đơn Nhà Cà Phê ${order.code}`,description:`${order.lines.length} dòng món · Ưu đãi ${order.discount.toLocaleString('vi-VN')} ₫`}},quantity:1}],
      metadata:{order_id:order.orderId,shop:'CF'},customer: demoCustomer, custom_text: demoCheckoutText,
      success_url:`${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout/cancel?order=${order.code}`},
      {idempotencyKey:`shop-CF-${order.orderId}-${currency}`});
  }
  try{let currency:'USD'|'VND'=preferred;let created:Stripe.Checkout.Session;
    try{created=await session(currency);}catch(e){if(currency!=='VND'||!currencyError(e))throw e;currency='USD';created=await session(currency);}
    await getPool().query(`UPDATE payments SET stripe_session_id=$1,charge_currency=$2,charge_amount=$3,demo_rate_vnd_per_usd=$4 WHERE order_id=$5`,[created.id,currency,created.amount_total,currency==='USD'?rate:null,order.orderId]);
    return NextResponse.json({url:created.url,code:order.code,currency});
  }catch(e){await abortStripeOrder(order.orderId);return NextResponse.json({error:e instanceof Error?`Stripe sandbox: ${e.message}`:'Không thể tạo Checkout'},{status:502});}
}
