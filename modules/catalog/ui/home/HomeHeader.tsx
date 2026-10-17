'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { readCart } from '@/modules/cart/cart';
import { Arrow, CoffeeMark, Icon } from './Icons';
import styles from './Home.module.css';

type Props = { user: { name: string; role: string } | null; categories: { id: number; name: string; slug: string }[] };

export default function HomeHeader({ user, categories }: Props) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const accountHref = user ? (user.role === 'admin' ? '/admin' : '/account/orders') : '/login';
  useEffect(() => {
    const update = () => setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    update();
    window.addEventListener('nha-ca-phe-cart', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('nha-ca-phe-cart', update); window.removeEventListener('storage', update); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const closeMenu = () => dialog.current?.close();
  function keepFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <>
    <header className={styles.header}>
      <button ref={trigger} className={styles.menuTrigger} aria-label="Menu" aria-haspopup="dialog" aria-controls="home-menu" aria-expanded={open} onClick={() => { dialog.current?.showModal(); setOpen(true); }}><Icon name="menu" /><span>Menu</span></button>
      <Link className={styles.brand} href="/" aria-label="Nhà Cà Phê — Trang chủ"><CoffeeMark /><span>Nhà Cà Phê<small>COFFEE & SLOW DAYS</small></span></Link>
      <div className={styles.headerActions}><Link className={styles.accountLink} href={accountHref} aria-label={user ? `Tài khoản của ${user.name}` : 'Đăng nhập'}><Icon name="user" /><span>{user ? user.name.split(' ').at(-1) : 'Đăng nhập'}</span></Link><Link className={styles.bagLink} href="/cart" aria-label={`Giỏ hàng có ${count} món`}><Icon name="bag" /><span className={styles.cartCount} aria-live="polite" aria-atomic="true">{count}</span></Link></div>
    </header>
    <dialog ref={dialog} id="home-menu" className={styles.menuDialog} aria-labelledby="home-menu-title" onKeyDown={keepFocus} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div className={styles.menuTop}><span className={styles.eyebrow} id="home-menu-title">KHÁM PHÁ NHÀ CÀ PHÊ</span><button className={styles.closeButton} onClick={closeMenu} autoFocus aria-label="Đóng menu"><Icon name="close" /></button></div>
      <div className={styles.menuBody}><nav aria-label="Điều hướng trang chủ" className={styles.menuNav}>
        <Link href="/products" onClick={closeMenu}>Thực đơn <Arrow /></Link>
        {categories.map(category => <Link key={category.id} href={`/products?category=${category.slug}`} onClick={closeMenu}>{category.name}<Arrow /></Link>)}
        <div className={styles.menuSecondary}><Link href="/account/orders" onClick={closeMenu}>Đơn của tôi <Arrow /></Link><Link href={accountHref} onClick={closeMenu}>{user ? 'Tài khoản của bạn' : 'Đăng nhập'}<Arrow /></Link><Link href="/cart" onClick={closeMenu}>Giỏ hàng ({count})<Arrow /></Link></div>
      </nav><div className={styles.menuPhoto}><Image src="/images/home-espresso.jpg" alt="Một ly cà phê được pha mới" fill sizes="(max-width: 700px) 1px, 45vw" /><span>Pha chậm.<br />Sống trọn.</span></div></div>
      <div className={styles.menuFoot}><CoffeeMark /><span>MỘT TÁCH CÀ PHÊ, MỘT NGÀY THẬT KHÁC.</span></div>
    </dialog>
  </>;
}
