export type DrinkOptions = { size:"S"|"M"|"L"; ice:0|50|100; sugar:0|30|50|100 };
export type CartItem = { productId:number; quantity:number; options:DrinkOptions|null };
const key='nha-ca-phe-cart-v1';
export const cartKey=(item:CartItem)=>`${item.productId}:${item.options?.size??'-'}:${item.options?.ice??'-'}:${item.options?.sugar??'-'}`;
export function readCart():CartItem[] {
  if(typeof window==='undefined') return [];
  try { const parsed=JSON.parse(localStorage.getItem(key)??'[]');
    return Array.isArray(parsed)?parsed.filter(x=>Number.isSafeInteger(x.productId)&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.quantity<=20):[];
  } catch { return []; }
}
export function saveCart(items:CartItem[]) { localStorage.setItem(key,JSON.stringify(items)); window.dispatchEvent(new Event('nha-ca-phe-cart')); }
export function addCart(productId:number,quantity=1,options:DrinkOptions|null=null) {
  const items=readCart(), next={productId,quantity,options}; const found=items.find(x=>cartKey(x)===cartKey(next));
  if(found) found.quantity=Math.min(20,found.quantity+quantity); else items.push(next); saveCart(items);
}
export function clearCart(){saveCart([]);}
export const optionText=(o:DrinkOptions|null)=>o?`Size ${o.size} · Đá ${o.ice}% · Đường ${o.sugar}%`:'Tiêu chuẩn';
export function unitPrice(price:number,small:number,large:number,o:DrinkOptions|null){return price+(o?.size==='S'?small:o?.size==='L'?large:0);}
