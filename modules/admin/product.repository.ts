import 'server-only';
import {transaction} from '@/modules/orders/repository';
import {getPool} from '@/lib/db';
import type {z} from 'zod';
import type {productSchema} from './product.service';
type Draft=z.infer<typeof productSchema>;
export async function saveProduct(x:Draft,id?:number){return transaction(async c=>{
  if(!id){const r=await c.query(`INSERT INTO products(category_id,sku,slug,name,description,price_vnd,opening_stock,image_path,active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id::int`,[x.categoryId,x.sku,x.sku.toLowerCase(),x.name,x.description,x.priceVnd,x.stock,x.imagePath,x.active]);id=r.rows[0].id;
  }else{const locked=await c.query(`SELECT id FROM products WHERE id=$1 FOR UPDATE`,[id]);if(!locked.rowCount)throw new Error('Không tìm thấy món');
    const stock=await c.query(`SELECT (p.opening_stock+COALESCE(SUM(m.quantity_delta),0))::int AS value FROM products p LEFT JOIN inventory_movements m ON m.product_id=p.id WHERE p.id=$1 GROUP BY p.id`,[id]);
    const delta=x.stock-Number(stock.rows[0].value);await c.query(`UPDATE products SET category_id=$1,sku=$2,slug=$3,name=$4,description=$5,price_vnd=$6,image_path=$7,active=$8 WHERE id=$9`,
      [x.categoryId,x.sku,x.sku.toLowerCase(),x.name,x.description,x.priceVnd,x.imagePath,x.active,id]);
    if(delta)await c.query(`INSERT INTO inventory_movements(product_id,quantity_delta,reason) VALUES($1,$2,'adjustment')`,[id,delta]);}
  await c.query(`INSERT INTO cafe_product_details(product_id,serving) VALUES($1,$2) ON CONFLICT(product_id) DO UPDATE SET serving=EXCLUDED.serving`,[id,x.serving]);
  await c.query(`INSERT INTO cafe_options(product_id,is_drink,size_s_delta_vnd,size_l_delta_vnd) VALUES($1,$2,$3,$4)
    ON CONFLICT(product_id) DO UPDATE SET is_drink=EXCLUDED.is_drink,size_s_delta_vnd=EXCLUDED.size_s_delta_vnd,size_l_delta_vnd=EXCLUDED.size_l_delta_vnd`,[id,x.isDrink,x.sizeSDeltaVnd,x.sizeLDeltaVnd]);return id;});}
export async function hideProduct(id:number){const r=await getPool().query(`UPDATE products SET active=false WHERE id=$1 RETURNING id`,[id]);return Boolean(r.rowCount);}
