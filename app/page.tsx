import Image from 'next/image';
import Link from 'next/link';
import { listProducts, listCategories } from '@/modules/catalog/repository';
import { currentUser } from '@/modules/auth/session';
import HomeHeader from '@/modules/catalog/ui/home/HomeHeader';
import HomeProduct from '@/modules/catalog/ui/home/HomeProduct';
import Reveal from '@/modules/catalog/ui/home/Reveal';
import { Arrow, CoffeeMark } from '@/modules/catalog/ui/home/Icons';
import styles from '@/modules/catalog/ui/home/Home.module.css';

export const dynamic = 'force-dynamic';

const categoryArt: Record<string, { image: string; label: string }> = {
  'ca-phe': { image: '/images/product-07.jpg', label: 'Đậm đà, theo cách bạn yêu.' },
  matcha: { image: '/images/product-05.jpg', label: 'Một khoảng xanh dịu dàng.' },
  'banh-ngot': { image: '/images/product-11.jpg', label: 'Chút ngọt cho ngày thảnh thơi.' },
};

export default async function Home() {
  const [products, categories, user] = await Promise.all([listProducts(), listCategories(), currentUser()]);
  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#main">Đến nội dung chính</a>
      <HomeHeader user={user} categories={categories} />
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <Image className={styles.heroImage} src="/images/home-espresso.jpg" alt="Espresso được rót chậm vào ly latte sữa đá" fill sizes="100vw" preload />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>NHÀ CÀ PHÊ</span>
            <h1 id="hero-title">Pha chậm.<br />Sống trọn.</h1>
            <Link className={styles.lightButton} href="/products">Khám phá thực đơn <Arrow /></Link>
          </div>
          <div className={styles.heroBottom}><span>COFFEE & SLOW DAYS</span><a className={styles.scrollCue} href="#cau-chuyen" aria-label="Cuộn đến câu chuyện Nhà Cà Phê"><Arrow down /></a><span>PHA MỚI MỖI NGÀY</span></div>
        </section>
        <section id="cau-chuyen" className={styles.intro} aria-labelledby="intro-title">
          <Reveal><span className={styles.eyebrow}>MỘT CHÚT BÌNH YÊN, MỖI NGÀY</span><h2 id="intro-title">Một tách cà phê,<br /><span>một ngày thật khác.</span></h2><p>Cà phê rang thơm, matcha thanh mát và món ăn nhẹ cho một khoảng dừng dễ chịu. Chọn món bạn yêu, tùy chỉnh theo gu và để Nhà Cà Phê mang chút bình yên đến tận tay bạn.</p><Link className={styles.textLink} href="/products">Tìm hương vị của bạn <Arrow /></Link></Reveal>
        </section>
        <section className={styles.categories} aria-labelledby="categories-title">
          <Reveal className={styles.sectionHeading}><div><span className={styles.eyebrow}>KHÁM PHÁ THEO GU</span><h2 id="categories-title">Mỗi hương vị.<br />Một niềm vui riêng.</h2></div><p>Đậm đà, thanh mát hay ngọt ngào.<br />Luôn có một món dành cho bạn.</p></Reveal>
          <div className={styles.categoryGrid}>
            {categories.filter(category => categoryArt[category.slug]).map((category, index) => <Reveal key={category.id}><Link className={styles.categoryCard} href={`/products?category=${category.slug}`}><Image src={categoryArt[category.slug].image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /><div className={styles.categoryShade} /><span className={styles.categoryIndex}>0{index + 1}</span><div className={styles.categoryCaption}><div><h3>{category.name}</h3><p>{categoryArt[category.slug].label}</p></div><span className={styles.circleArrow}><Arrow /></span></div></Link></Reveal>)}
          </div>
        </section>
        <section className={styles.featured} aria-labelledby="featured-title">
          <Reveal className={styles.sectionHeading}><div><span className={styles.eyebrow}>MÓN DÀNH CHO HÔM NAY</span><h2 id="featured-title">Một lựa chọn thật vừa ý.</h2></div><Link className={styles.textLink} href="/products">Toàn bộ thực đơn <Arrow /></Link></Reveal>
          <div className={styles.productGrid}>{products.slice(0, 3).map(product => <Reveal key={product.id}><HomeProduct product={product} /></Reveal>)}</div>
          {!products.length && <p>Thực đơn đang được cập nhật. Hẹn bạn một tách cà phê thật ngon.</p>}
        </section>
        <section className={styles.closing} aria-labelledby="closing-title">
          <Image src="/images/home-coffee-table.jpg" alt="Hai tách cà phê trên bàn gỗ ấm áp" fill sizes="100vw" /><div className={styles.closingShade} />
          <Reveal className={styles.closingContent}><span className={styles.eyebrow}>GOOD COFFEE. GOOD DAYS.</span><h2 id="closing-title">Dành một khoảng dừng<br />cho mình.</h2><Link className={styles.lightButton} href="/products">Chọn món bạn yêu <Arrow /></Link></Reveal>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><Link className={styles.footerBrand} href="/" aria-label="Nhà Cà Phê — Trang chủ"><CoffeeMark /><span>Nhà Cà Phê<small>COFFEE & SLOW DAYS</small></span></Link><p>Những ngày đẹp bắt đầu<br />từ một tách cà phê.</p><nav aria-label="Liên kết cuối trang"><Link href="/products">Thực đơn <Arrow /></Link><Link href="/account/orders">Đơn hàng <Arrow /></Link><Link href="/admin">Quản trị <Arrow /></Link></nav></div>
        <div className={styles.footerBottom}><span>© 2026 Nhà Cà Phê</span><span>Dự án demo / CV</span><a href="#main">Về đầu trang <Arrow down /></a></div>
      </footer>
    </div>
  );
}
