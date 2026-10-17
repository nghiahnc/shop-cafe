"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {readCart} from '@/modules/cart/cart';
export default function StoreHeader({user}:{user:{name:string;role:string}|null}){
  const [count,setCount]=useState(0);
  useEffect(()=>{const update=()=>setCount(readCart().reduce((s,x)=>s+x.quantity,0));update();window.addEventListener('nha-ca-phe-cart',update);window.addEventListener('storage',update);return()=>{window.removeEventListener('nha-ca-phe-cart',update);window.removeEventListener('storage',update);};},[]);
  return <><div className="store-announcement">Cà phê cho mọi khoảnh khắc · Giao hàng miễn phí trong bản demo</div><header className="store-header"><div className="store-header-inner">
    <Link className="store-logo" href="/"><span className="store-logo-icon" aria-hidden="true">●</span><span>Nhà Cà Phê<small>COFFEE & SLOW DAYS</small></span></Link>
    <nav aria-label="Điều hướng cửa hàng"><Link href="/">Trang chủ</Link><Link href="/products">Thực đơn</Link><Link href="/products?category=ca-phe">Cà phê</Link><Link href="/account/orders">Đơn của tôi</Link></nav>
    <div className="store-header-actions">{user?<Link href={user.role==='admin'?'/admin':'/account/orders'} className="store-user-link">Xin chào, {user.name.split(' ').at(-1)}</Link>:<Link href="/login">Đăng nhập</Link>}<Link href="/cart" className="store-cart-link" aria-label={`Giỏ hàng có ${count} món`}>Giỏ hàng <b>{count}</b></Link></div>
  </div></header></>;
}
