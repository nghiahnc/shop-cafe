'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { brand } from './brand';
export default function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return children;
  return <div className="boutique" data-storefront={brand.wordmark}><a className="bt-skip" href="#boutique-content">Đến nội dung chính</a><div id="boutique-content" className="bt-content" tabIndex={-1}>{children}</div><footer className="bt-footer"><div className="bt-footer-columns"><div><h2>KHÁM PHÁ</h2><Link href="/products">{brand.label}</Link><Link href="/#brand-story">Câu chuyện {brand.name}</Link></div><div><h2>TÀI KHOẢN</h2><Link href="/account/orders">Theo dõi đơn hàng</Link><Link href="/cart">Giỏ hàng của bạn</Link><Link href="/login">Đăng nhập</Link></div><div><h2>VỀ {brand.wordmark}</h2><p>{brand.description}</p><span>Việt Nam · Tiếng Việt · VND</span></div></div><div className="bt-footer-bottom"><Link href="/" className="bt-wordmark">{brand.wordmark}</Link><span>© 2026 {brand.name} · Cửa hàng demo</span><a href="#boutique-content">Về đầu trang ↑</a></div></footer></div>;
}
