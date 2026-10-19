'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { readCart } from '@/modules/cart/cart';
import { signOut } from 'next-auth/react';
import { brand } from './brand';
import Dialog from './Dialog';
import Icon from './Icon';

export type HeaderProps = { user: { name: string; role: string } | null; categories: { name: string; slug?: string }[]; hero?: boolean };
export default function Header({ user, categories, hero = false }: HeaderProps) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<'menu' | 'search' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  const close = useCallback(() => setPanel(null), []);
  useEffect(() => { close(); }, [pathname, close]);
  useEffect(() => {
    const update = () => setCount(readCart().reduce((total, item) => total + item.quantity, 0));
    const scroll = () => setScrolled(window.scrollY > 40);
    update(); scroll();
    window.addEventListener('nha-ca-phe-cart', update); window.addEventListener('storage', update); window.addEventListener('scroll', scroll, { passive: true });
    return () => { window.removeEventListener('nha-ca-phe-cart', update); window.removeEventListener('storage', update); window.removeEventListener('scroll', scroll); };
  }, []);
  const account = user ? '/account/orders' : '/login';
  return <>
    <header className={`bt-header ${hero ? 'bt-header-hero' : ''} ${hero && !scrolled ? 'bt-header-clear' : ''}`}>
      <div className="bt-header-left"><button type="button" className="bt-header-control" aria-label="Mở menu" aria-haspopup="dialog" aria-expanded={panel === 'menu'} onClick={() => setPanel('menu')}><Icon name="menu"/><span>Menu</span></button><button type="button" className="bt-header-control" aria-label="Tìm kiếm" aria-haspopup="dialog" aria-expanded={panel === 'search'} onClick={() => setPanel('search')}><Icon name="search"/><span>Tìm kiếm</span></button></div>
      <Link href="/" className="bt-wordmark" aria-label={`${brand.name} — Trang chủ`}>{brand.wordmark}</Link>
      <div className="bt-header-right"><Link href={account} className="bt-header-control" aria-label={user ? `Tài khoản của ${user.name}` : 'Đăng nhập'}><Icon name="user"/><span>{user ? user.name.split(' ').at(-1) : 'Tài khoản'}</span></Link><Link href="/cart" className="bt-header-control bt-bag" aria-label={`Giỏ hàng có ${count} sản phẩm`}><Icon name="bag"/><span className="bt-count" aria-live="polite" aria-atomic="true">{count}</span></Link></div>
    </header>
    <Dialog open={panel === 'menu'} close={close} title="Khám phá">
      <nav className="bt-menu" aria-label="Điều hướng cửa hàng"><Link href="/products" onClick={close}>{brand.label}<Icon name="arrow"/></Link>{categories.map(category => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.slug ?? category.name)}`} onClick={close}>{category.name}<Icon name="arrow"/></Link>)}<div className="bt-menu-secondary"><Link href="/account/orders" onClick={close}>Đơn hàng của tôi</Link><Link href={account} onClick={close}>{user ? user.name : 'Đăng nhập / Đăng ký'}</Link>{user?.role === 'admin' && <Link href="/admin" onClick={close}>Quản trị cửa hàng</Link>}{user && <button type="button" onClick={async () => { await signOut({ callbackUrl: '/' }); }}>Đăng xuất</button>}</div></nav>
      <div className="bt-menu-picture"><Image src="/images/editorial-story.jpg" alt="" fill sizes="480px"/><span>{brand.name}</span></div>
    </Dialog>
    <Dialog open={panel === 'search'} close={close} title="Bạn đang tìm gì?" side="right"><form className="bt-search" action="/products" onSubmit={close}><label htmlFor="bt-search-query">Tìm trong {brand.name}</label><div><input id="bt-search-query" name="q" type="search" placeholder="Tên sản phẩm hoặc cảm hứng..." maxLength={100}/><button type="submit" className="bt-icon-button" aria-label="Tìm sản phẩm"><Icon name="search"/></button></div></form><p className="bt-panel-label">KHÁM PHÁ DANH MỤC</p><nav className="bt-search-categories">{categories.map(category => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.slug ?? category.name)}`} onClick={close}>{category.name}<Icon name="arrow"/></Link>)}</nav></Dialog>
  </>;
}
