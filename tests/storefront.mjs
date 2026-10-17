import './network.mjs';
import { databaseUrl } from '../db/env.mjs';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3002';
const db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 20000 });

async function login(email,password) {
  const csrfResponse=await fetch(`${base}/api/auth/csrf`);
  if(!csrfResponse.ok)throw new Error(`CSRF ${csrfResponse.status}`);
  const {csrfToken}=await csrfResponse.json();
  let cookies=csrfResponse.headers.getSetCookie().map(value=>value.split(';')[0]);
  const response=await fetch(`${base}/api/auth/callback/credentials`,{
    method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies.join('; ')},
    body:new URLSearchParams({csrfToken,email,password,callbackUrl:base+'/account/orders'})
  });
  await response.arrayBuffer();
  const authCookies=response.headers.getSetCookie();
  if(base.startsWith('https:'))assert.ok(authCookies.some(value=>value.includes('session-token=')&&/; Secure/i.test(value)), 'Session cookie must be Secure on HTTPS');
  cookies=[...cookies,...authCookies.map(value=>value.split(';')[0])];
  const session=await fetch(`${base}/api/auth/session`,{headers:{Cookie:cookies.join('; ')}}).then(r=>r.json());
  if(!session?.user?.email)throw new Error(`Đăng nhập ${email} thất bại: ${response.status}`);
  return cookies.join('; ');
}
async function request(path,body,cookie){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});}

await db.connect();
let promoId;
const orderIds=[];
let registeredEmail;
let uploadedPath;
let uploadedKey;
try {
  const unauthorized=await request('/api/orders',{items:[]});
  await unauthorized.arrayBuffer();
  if(unauthorized.status!==401)throw new Error(`Đơn khách chưa đăng nhập: ${unauthorized.status}`);
  console.log('PASS anonymous order rejected (401)');
  const customer=await login('demo@nhacaphe.local','Demo1234!');
  let rejectedPassword=false;
  try{await login('demo@nhacaphe.local','not-the-password');}catch{rejectedPassword=true;}
  assert.ok(rejectedPassword,'Wrong password must be rejected');
  const adminDenied=await request('/api/admin/products',{sku:'BAD'},customer);
  await adminDenied.arrayBuffer();
  if(adminDenied.status!==403)throw new Error(`Khách truy cập admin: ${adminDenied.status}`);
  const admin=await login('admin@nhacaphe.local','Admin1234!');
  const adminPage=await fetch(`${base}/admin`,{headers:{Cookie:admin},redirect:'manual'});
  await adminPage.arrayBuffer();
  if(adminPage.status!==200)throw new Error(`Admin không vào dashboard: ${adminPage.status}`);
  console.log('PASS customer/admin login, wrong password rejection, role checks and admin dashboard');
  registeredEmail=`test-${randomUUID()}@example.test`;
  const registration=await request('/api/auth/register',{name:'Khách kiểm thử',email:registeredEmail,password:'Demo1234!'});
  await registration.arrayBuffer();
  if(registration.status!==201)throw new Error(`Đăng ký: ${registration.status}`);
  const newCustomer=await login(registeredEmail,'Demo1234!');
  if(!newCustomer)throw new Error('Tài khoản vừa đăng ký không đăng nhập được');
  const image=await readFile(join(process.cwd(),'public','images','product-01.jpg'));
  const uploadForm=new FormData();uploadForm.set('file',new Blob([image],{type:'image/jpeg'}),'test.jpg');
  const upload=await fetch(`${base}/api/admin/upload`,{method:'POST',headers:{Cookie:admin},body:uploadForm});
  const uploadResult=await upload.json();
  if(upload.status!==200||!/^\/(?:images|api\/media)\/upload-[a-z0-9-]+\.jpg$/.test(uploadResult.imagePath??''))throw new Error(`Tải ảnh admin: ${JSON.stringify(uploadResult)}`);
  if(uploadResult.imagePath.startsWith('/api/media/'))uploadedKey=uploadResult.imagePath.split('/').at(-1);
  else uploadedPath=join(process.cwd(),'public',uploadResult.imagePath.slice(1));
  const downloaded=await fetch(base+uploadResult.imagePath);
  assert.equal(downloaded.status,200,'Uploaded image must be readable');
  assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(image),'Uploaded bytes must match');
  const invalidImages = [[Buffer.from('invalid-image'),'image/jpeg',400]];
  if (!process.env.TEST_SKIP_LARGE_UPLOAD) invalidImages.push([Buffer.alloc(5_100_000),'image/jpeg',400]);
  for(const [bytes,type,expected] of invalidImages){
    const invalidForm=new FormData();invalidForm.set('file',new Blob([bytes],{type}),'invalid.jpg');
    const invalidResponse=await fetch(base+'/api/admin/upload',{method:'POST',headers:{Cookie:admin},body:invalidForm,signal:AbortSignal.timeout(40000)});
    await invalidResponse.arrayBuffer();
    assert.equal(invalidResponse.status,expected);
  }
  console.log('PASS registration, image upload/read and invalid image rejection');
  console.log(process.env.TEST_SKIP_LARGE_UPLOAD ? 'SKIP large legacy multipart upload; test the direct upload flow separately on Vercel' : 'PASS oversized image rejected');
  const code=`TEST${randomUUID().slice(0,8).toUpperCase()}`;
  const promo=await db.query(`INSERT INTO promotions(name,mode,code,discount_type,discount_value,min_subtotal_vnd,max_uses,starts_at,ends_at)
    VALUES('Concurrent test','code',$1,'fixed',1000,0,1,now()-interval '1 minute',now()+interval '1 day') RETURNING id`,[code]);
  promoId=promo.rows[0].id;
  const products=(await db.query(`SELECT id FROM products WHERE active=true ORDER BY id LIMIT 2`)).rows;
  const bodies=products.map(product=>({items:[{productId:Number(product.id),quantity:1,options:{size:'M',ice:product.id===products[0].id?0:100,sugar:100}}],promoCode:code,name:'Khách demo',phone:'0901234567',fulfillment:'pickup',address:'',city:'',note:'Kiểm thử giới hạn',method:'cash'}));
  const responses=await Promise.all(bodies.map(body=>request('/api/orders',body,customer)));
  const values=await Promise.all(responses.map(async response=>({status:response.status,body:await response.json()})));
  for(const value of values)if(value.body.orderId)orderIds.push(value.body.orderId);
  const statuses=values.map(value=>value.status).sort((a,b)=>a-b);
  if(statuses[0]!==201||statuses[1]!==400)throw new Error(`Giới hạn mã đồng thời sai: ${JSON.stringify(values)}`);
  const uses=(await db.query(`SELECT COUNT(*)::int AS count FROM promotion_redemptions WHERE promotion_id=$1`,[promoId])).rows[0].count;
  if(uses!==1)throw new Error(`Số lượt dùng: ${uses}`);
  const placed=values.find(value=>value.status===201).body;
  const history=await fetch(`${base}/account/orders`,{headers:{Cookie:customer}});
  if(history.status!==200||!(await history.text()).includes(placed.code))throw new Error('Đơn vừa đặt không hiện trong lịch sử');
  const reserved=(await db.query(`SELECT COALESCE(SUM(quantity_delta),0)::int AS quantity FROM inventory_movements WHERE order_id=$1`,[placed.orderId])).rows[0];
  if(reserved.quantity!==-1)throw new Error('Đơn mới chưa giữ đúng tồn kho');
  const cancelled=await request(`/api/orders/${placed.orderId}/cancel`,{},customer);
  if(cancelled.status!==200)throw new Error(`Hủy đơn: ${cancelled.status}`);
  const state=(await db.query(`SELECT o.status,
    (SELECT COALESCE(SUM(quantity_delta),0)::int FROM inventory_movements WHERE order_id=o.id) AS inventory_delta,
    (SELECT COUNT(*)::int FROM promotion_redemptions WHERE order_id=o.id) AS redemptions
    FROM orders o WHERE o.id=$1`,[placed.orderId])).rows[0];
  if(state.status!=='cancelled'||state.inventory_delta!==0||state.redemptions!==0)throw new Error(`Hủy đơn chưa hoàn tồn/lượt mã: ${JSON.stringify(state)}`);
  console.log('Storefront: đăng ký/đăng nhập, quyền admin, upload ảnh; hai đơn đồng thời dùng mã max 1 chỉ một đơn thành công.');
  console.log('PASS order round trip: create -> order history -> cancel; inventory and promotion use restored in Postgres.');
} finally {
  for(const id of orderIds){
    await db.query('DELETE FROM promotion_redemptions WHERE order_id=$1',[id]);
    await db.query('DELETE FROM inventory_movements WHERE order_id=$1',[id]);
    await db.query('DELETE FROM order_items WHERE order_id=$1',[id]);
    await db.query('DELETE FROM payments WHERE order_id=$1',[id]);
    await db.query('DELETE FROM orders WHERE id=$1',[id]);
  }
  if(promoId)await db.query('DELETE FROM promotions WHERE id=$1',[promoId]);
  if(registeredEmail)await db.query('DELETE FROM users WHERE email=$1',[registeredEmail]);
  if(uploadedPath)await unlink(uploadedPath);
  if(uploadedKey){
    const s3=new S3Client({endpoint:process.env.UPLOAD_S3_ENDPOINT||process.env.AWS_ENDPOINT_URL_S3,region:process.env.UPLOAD_S3_REGION||process.env.AWS_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.UPLOAD_S3_ACCESS_KEY_ID||process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.UPLOAD_S3_SECRET_ACCESS_KEY||process.env.AWS_SECRET_ACCESS_KEY}});
    try{await s3.send(new DeleteObjectCommand({Bucket:'cafe-uploads',Key:uploadedKey}));}finally{s3.destroy();}
  }
  await db.end();
}
