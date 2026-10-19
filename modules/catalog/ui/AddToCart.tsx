"use client";
import useReady from '@/components/boutique/useReady';
import {useState} from 'react';import Link from 'next/link';
import {addCart,type DrinkOptions} from '@/modules/cart/cart';import type {CatalogProduct} from '@/modules/catalog/repository';
const money=(v:number)=>new Intl.NumberFormat('vi-VN').format(v)+' ₫';
export default function AddToCart({product}:{product:CatalogProduct}){
  const ready = useReady();
  const [quantity,setQuantity]=useState(1),[size,setSize]=useState<DrinkOptions['size']>('M'),[ice,setIce]=useState<DrinkOptions['ice']>(product.serving==='Nóng'?0:100),[sugar,setSugar]=useState<DrinkOptions['sugar']>(100),[added,setAdded]=useState(false);
  const price=product.price_vnd+(size==='S'?product.size_s_delta_vnd:size==='L'?product.size_l_delta_vnd:0);
  return <div className="store-customizer">{product.is_drink&&<div className="store-options"><label>Size<select disabled={!ready} value={size} onChange={e=>setSize(e.target.value as DrinkOptions['size'])}><option value="S">S · {money(product.price_vnd+product.size_s_delta_vnd)}</option><option value="M">M · {money(product.price_vnd)}</option><option value="L">L · {money(product.price_vnd+product.size_l_delta_vnd)}</option></select></label><label>Đá<select value={ice} onChange={e=>setIce(Number(e.target.value) as DrinkOptions['ice'])} disabled={!ready || product.serving==='Nóng'}>{(product.serving==='Nóng'?[0]:[0,50,100]).map(x=><option key={x} value={x}>{x}%</option>)}</select></label><label>Đường<select disabled={!ready} value={sugar} onChange={e=>setSugar(Number(e.target.value) as DrinkOptions['sugar'])}>{[0,30,50,100].map(x=><option key={x} value={x}>{x}%</option>)}</select></label></div>}
    <div className="store-add-row"><label>Số lượng<input type="number" disabled={!ready} min="1" max={Math.min(20,product.stock)} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><button disabled={!ready||!product.stock||!Number.isInteger(quantity)||quantity<1||quantity>Math.min(20,product.stock)} onClick={()=>{addCart(product.id,quantity,product.is_drink?{size,ice,sugar}:null);setAdded(true);}}>{added?'Đã thêm vào giỏ ✓':`Thêm vào giỏ · ${money(price*quantity)}`}</button>{added&&<Link href="/cart">Xem giỏ hàng →</Link>}</div>
  </div>;
}
