"use client";
import Link from 'next/link';import {useState} from 'react';
import {addCart} from '@/modules/cart/cart';import type {CatalogProduct} from '@/modules/catalog/repository';
const money=(v:number)=>new Intl.NumberFormat('vi-VN').format(v)+' ₫';
export default function ProductCard({product}:{product:CatalogProduct}){const [added,setAdded]=useState(false);
  return <article className="store-product-card"><Link href={`/products/${product.slug}`} className="store-product-photo"><img src={product.image_path} alt={product.name}/><span>{product.is_drink?product.serving:"Ăn nhẹ"}</span></Link>
    <div className="store-product-details"><small>{product.category} · {product.is_drink?'Tùy chỉnh theo gu':'Ăn nhẹ'}</small><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><p>{product.description}</p>
      <div className="store-product-bottom"><strong>{money(product.price_vnd)}</strong><button type="button" disabled={product.stock<1} onClick={()=>{addCart(product.id,1,product.is_drink?{size:'M',ice:product.serving==='Nóng'?0:100,sugar:100}:null);setAdded(true);setTimeout(()=>setAdded(false),1800);}}>{product.stock<1?'Hết món':added?'Đã thêm ✓':'Thêm vào giỏ +'}</button></div></div></article>;
}

