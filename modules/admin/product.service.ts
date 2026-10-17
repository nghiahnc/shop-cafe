import 'server-only';
import {z} from 'zod';
import {saveProduct,hideProduct} from '@/modules/admin/product.repository';
export const productSchema=z.object({sku:z.string().trim().regex(/^[A-Za-z0-9-]{3,30}$/),name:z.string().trim().min(3).max(120),description:z.string().trim().min(5).max(1000),
  categoryId:z.number().int().positive(),priceVnd:z.number().int().positive().max(1000000000),stock:z.number().int().min(0).max(1000000),
  imagePath:z.string().regex(/^(?:\/images\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)|\/api\/media\/upload-[0-9a-f-]{36}\.(?:jpg|png|webp))$/),serving:z.enum(['Nóng','Đá','Tại quán']),
  isDrink:z.boolean(),sizeSDeltaVnd:z.number().int().min(-100000).max(100000),sizeLDeltaVnd:z.number().int().min(-100000).max(100000),active:z.boolean()})
  .refine(x=>x.priceVnd+x.sizeSDeltaVnd>0,{message:'Giá size S phải dương'});
export async function upsertProduct(raw:unknown,id?:number){return saveProduct(productSchema.parse(raw),id);}
export async function archiveProduct(id:number){return hideProduct(id);}
