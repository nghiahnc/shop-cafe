import "server-only";
import { getPool } from "@/lib/db";

export type CatalogProduct = {
  id:number; slug:string; sku:string; name:string; description:string; category:string; category_id:number;
  price_vnd:number; image_path:string; stock:number; active:boolean; serving:string; is_drink:boolean;
  size_s_delta_vnd:number; size_l_delta_vnd:number;
};
const base = `SELECT p.id::int,p.slug,p.sku,p.name,p.description,p.category_id::int,c.name AS category,
  p.price_vnd::float8,p.image_path,p.active,COALESCE(d.serving,'') AS serving,
  COALESCE(o.is_drink,false) AS is_drink,COALESCE(o.size_s_delta_vnd,-5000)::float8 AS size_s_delta_vnd,
  COALESCE(o.size_l_delta_vnd,10000)::float8 AS size_l_delta_vnd,
  (p.opening_stock+COALESCE((SELECT SUM(quantity_delta) FROM inventory_movements WHERE product_id=p.id),0))::int AS stock
  FROM products p JOIN categories c ON c.id=p.category_id
  LEFT JOIN cafe_product_details d ON d.product_id=p.id LEFT JOIN cafe_options o ON o.product_id=p.id`;
export async function listProducts(filters:{q?:string;category?:string;serving?:string;includeInactive?:boolean}={}) {
  const result=await getPool().query(`${base} WHERE ($1='' OR p.name ILIKE '%'||$1||'%' OR p.description ILIKE '%'||$1||'%')
    AND ($2='' OR c.slug=$2) AND ($3='' OR d.serving=$3) ${filters.includeInactive?'':'AND p.active=true'} ORDER BY p.id`,
    [filters.q?.trim()??'',filters.category??'',filters.serving??'']);
  return result.rows as CatalogProduct[];
}
export async function getProduct(slug:string) {
  const result=await getPool().query(`${base} WHERE p.slug=$1 AND p.active=true`,[slug]);
  return (result.rows[0]??null) as CatalogProduct|null;
}
export async function listCategories() {
  const result=await getPool().query(`SELECT id::int,name,slug FROM categories ORDER BY id`);
  return result.rows as {id:number;name:string;slug:string}[];
}
export async function listServings() {
  const result=await getPool().query(`SELECT DISTINCT serving FROM cafe_product_details ORDER BY serving`);
  return result.rows.map(x=>String(x.serving));
}
