import { databaseUrl } from './env.mjs';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(await readFile(join(dir, '../data/products.json'), 'utf8'));
const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 20000 });
await client.connect();
let state = 20261013;
const rand = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
try {
  await client.query('BEGIN');
  const existing = await client.query('SELECT COUNT(*)::int AS count FROM products');
  if (existing.rows[0].count > 0) {
    console.log('Seed đã có; bỏ qua để giữ đơn thử hiện tại.');
    await client.query('ROLLBACK');
    process.exit(0);
  }
  const categoryIds = new Map();
  for (const name of [...new Set(products.map((p) => p.category))]) {
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const result = await client.query('INSERT INTO categories(name,slug) VALUES($1,$2) RETURNING id', [name,slug]);
    categoryIds.set(name,result.rows[0].id);
  }
  const productIds = [];
  for (const [index,p] of products.entries()) {
    const values = [categoryIds.get(p.category),p.sku,p.name,p.description,p.price,p.stock,`/images/product-${String(index+1).padStart(2,'0')}.jpg`];
    const result = await client.query(`INSERT INTO products(category_id,sku,name,description,price_vnd,opening_stock,image_path,slug)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[...values,p.sku.toLowerCase()]);
    productIds.push(result.rows[0].id);
    await client.query('INSERT INTO cafe_product_details(product_id,serving) VALUES($1,$2)',[result.rows[0].id,p.serving]);
    await client.query('INSERT INTO cafe_options(product_id,is_drink) VALUES($1,$2)',[result.rows[0].id,p.category!=='Bánh ngọt']);
  }
  const names = ['Nguyễn Minh Anh','Trần Gia Hân','Lê Hoàng Nam','Phạm Thảo Nhi','Đỗ Khánh Linh','Vũ Đức Anh','Hoàng Ngọc Mai','Bùi Thanh Tùng','Phan Hồng Nhung','Ngô Nhật Minh','Nguyễn Thu Hà','Lâm Bảo Châu','Trịnh Quang Huy','Cao Thanh Trúc','Dương Hải Yến','Đặng Quốc Bảo','Mai Phương Thảo','Tạ Anh Khoa','Lý Mỹ Duyên','Hồ Gia Bảo','Nguyễn Hà My','Trần Đình Phúc','Võ Minh Tâm','Phạm Thùy Dương','Lê Quốc Khánh'];
  const customerIds=[];
  for (const [i,name] of names.entries()) {
    const result=await client.query('INSERT INTO customers(full_name,email) VALUES($1,$2) RETURNING id',[name,`customer${i+1}@example.test`]);
    customerIds.push(result.rows[0].id);
  }
  for (let i=0;i<120;i++) {
    const count=1+Math.floor(rand()*3);
    const selected=[];
    while(selected.length<count){const index=Math.floor(rand()*products.length);if(!selected.includes(index))selected.push(index);}
    const items=selected.map(index=>({index,quantity:1+Math.floor(rand()*2)}));
    const total=items.reduce((sum,item)=>sum+products[item.index].price*item.quantity,0);
    const status=i%13===0?'cancelled':i%9===0?'pending':'paid';
    const agoDays=Math.floor(rand()*89);
    const placedAt=new Date(Date.now()-agoDays*86400000-Math.floor(rand()*86400000));
    const customerId=customerIds[Math.floor(rand()*customerIds.length)];
    const code=`CF-${String(i+1).padStart(4,'0')}`;
    const result=await client.query('INSERT INTO orders(code,customer_id,status,source,subtotal_vnd,total_vnd,placed_at) VALUES($1,$2,$3,$4,$5,$5,$6) RETURNING id',[code,customerId,status,'seed',total,placedAt]);
    const orderId=result.rows[0].id;
    for(const item of items){const p=products[item.index];await client.query('INSERT INTO order_items(order_id,product_id,product_name,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,$5,$6)',[orderId,productIds[item.index],p.name,p.price,item.quantity,p.price*item.quantity]);if(status==='paid')await client.query('INSERT INTO inventory_movements(product_id,order_id,quantity_delta,reason,created_at) VALUES($1,$2,$3,$4,$5)',[productIds[item.index],orderId,-item.quantity,'sale',placedAt]);}
    await client.query('INSERT INTO payments(order_id,provider,status,amount_vnd,charge_currency,charge_amount,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[orderId,'seed',status==='paid'?'paid':status==='pending'?'pending':'expired',total,'VND',total,status==='paid'?placedAt:null]);
  }
  await client.query('COMMIT');
  console.log(`Seed hoàn tất: ${products.length} sản phẩm, ${customerIds.length} khách, 120 đơn.`);
} catch(error){await client.query('ROLLBACK');throw error;} finally{await client.end();}
