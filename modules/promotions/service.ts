import "server-only";
import { z } from "zod";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";

export const promotionSchema=z.object({
  name:z.string().trim().min(3).max(100), mode:z.enum(['code','automatic']),
  code:z.string().trim().max(30).optional(), discountType:z.enum(['percent','fixed']),
  discountValue:z.number().int().positive(), minSubtotalVnd:z.number().int().min(0),
  maxUses:z.number().int().positive().nullable(), startsAt:z.iso.datetime(), endsAt:z.iso.datetime(), active:z.boolean(),
}).superRefine((x,ctx)=>{
  if(x.mode==='code'&&!/^[A-Z0-9_-]{3,30}$/.test(x.code?.toUpperCase()??'')) ctx.addIssue({code:'custom',message:'Mã ưu đãi không hợp lệ',path:['code']});
  if(x.discountType==='percent'&&x.discountValue>100) ctx.addIssue({code:'custom',message:'Tỷ lệ tối đa 100%',path:['discountValue']});
  if(Date.parse(x.endsAt)<=Date.parse(x.startsAt)) ctx.addIssue({code:'custom',message:'Ngày kết thúc phải sau ngày bắt đầu',path:['endsAt']});
});
export type Promotion={id:string;name:string;mode:'code'|'automatic';code:string|null;discount_type:'percent'|'fixed';discount_value:number;min_subtotal_vnd:number;max_uses:number|null;active:boolean;starts_at:string;ends_at:string;uses:number};
export async function listPromotions(){ const r=await getPool().query(`SELECT p.id::text,p.name,p.mode,p.code,p.discount_type,p.discount_value::float8,p.min_subtotal_vnd::float8,
  p.max_uses,p.active,p.starts_at::text,p.ends_at::text,(SELECT COUNT(*)::int FROM promotion_redemptions r WHERE r.promotion_id=p.id) AS uses
  FROM promotions p ORDER BY p.created_at DESC,p.id DESC`);return r.rows as Promotion[]; }
export async function savePromotion(raw:unknown,id?:string){const x=promotionSchema.parse(raw),code=x.mode==='code'?x.code!.toUpperCase():null;
  const params=[x.name,x.mode,code,x.discountType,x.discountValue,x.minSubtotalVnd,x.maxUses,x.startsAt,x.endsAt,x.active];
  const sql=id?`UPDATE promotions SET name=$1,mode=$2,code=$3,discount_type=$4,discount_value=$5,min_subtotal_vnd=$6,max_uses=$7,starts_at=$8,ends_at=$9,active=$10 WHERE id=$11 RETURNING id::text`:
    `INSERT INTO promotions(name,mode,code,discount_type,discount_value,min_subtotal_vnd,max_uses,starts_at,ends_at,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`;
  const r=await getPool().query(sql,id?[...params,id]:params);if(!r.rowCount) throw new Error('Không tìm thấy khuyến mãi');return r.rows[0]; }
export async function disablePromotion(id:string){const r=await getPool().query(`UPDATE promotions SET active=false WHERE id=$1 RETURNING id`,[id]);if(!r.rowCount) throw new Error('Không tìm thấy khuyến mãi');}
export type AppliedPromotion={id:string;name:string;code:string|null;discount:number};
export async function selectPromotion(client:PoolClient,subtotal:number,rawCode?:string,lock=false):Promise<AppliedPromotion|null>{
  const code=rawCode?.trim().toUpperCase()??'';
  const query=`SELECT p.id::text,p.name,p.code,p.mode,p.discount_type,p.discount_value::float8,p.min_subtotal_vnd::float8,p.max_uses
    FROM promotions p WHERE p.active=true AND now() BETWEEN p.starts_at AND p.ends_at AND (p.mode='automatic' OR p.code=$1)
    ORDER BY p.id ${lock?'FOR UPDATE OF p':''}`;
  const rows=(await client.query(query,[code])).rows;
  if(code&&!rows.some(x=>x.code===code)) throw new Error('Mã ưu đãi không hợp lệ hoặc đã hết hạn');
  for(const row of rows){const count=await client.query(`SELECT COUNT(*)::int AS uses FROM promotion_redemptions WHERE promotion_id=$1`,[row.id]);row.uses=count.rows[0].uses;}
  const candidates=rows.filter(x=>subtotal>=Number(x.min_subtotal_vnd)&&(!x.max_uses||Number(x.uses)<Number(x.max_uses)));
  if(code&&!candidates.some(x=>x.code===code)) throw new Error('Mã ưu đãi chưa đủ điều kiện hoặc đã hết lượt');
  const ranked=candidates.map(x=>({...x,discount:Math.min(subtotal,x.discount_type==='percent'?Math.floor(subtotal*Number(x.discount_value)/100):Number(x.discount_value))}));
  ranked.sort((a,b)=>b.discount-a.discount||Number(a.id)-Number(b.id));
  const best=ranked[0];return best?{id:best.id,name:best.name,code:best.code,discount:best.discount}:null;
}
export async function quotePromotion(subtotal:number,code?:string){const client=await getPool().connect();try{return await selectPromotion(client,subtotal,code);}finally{client.release();}}
