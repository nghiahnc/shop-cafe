import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { brand } from './brand';
export default function EditorialHome({ children }: { children: ReactNode }) {
  return <main id="main" className="bt-home">
    <section className="bt-campaign" aria-labelledby="campaign-title"><Image src="/images/editorial-hero.jpg" alt={brand.heroAlt} fill sizes="100vw" preload/><div className="bt-campaign-shade"/><div className="bt-campaign-copy"><p>{brand.campaign}</p><h1 id="campaign-title">{brand.headline}</h1><Link href="/products" className="bt-underline">Khám phá {brand.label.toLowerCase()}</Link></div></section>
    <section className="bt-discover" aria-labelledby="discover-title"><h2 id="discover-title">Khám phá thế giới {brand.name}</h2><div className={`bt-category-grid bt-category-count-${brand.images.length}`}>{brand.images.map(item => <Link href={item.href} key={item.name}><div className="bt-category-image"><Image src={item.image} alt={item.name} fill sizes="(max-width: 767px) 50vw, 25vw"/></div><h3>{item.name}</h3></Link>)}</div></section>
    <section aria-labelledby="collection-title" className="bt-collection"><div className="bt-collection-image"><Image src="/images/editorial-story.jpg" alt={brand.storyAlt} fill sizes="100vw"/></div><div className="bt-section-title"><p>TUYỂN CHỌN TỪ {brand.wordmark}</p><h2 id="collection-title">{brand.collection}</h2></div><div className="bt-featured-grid">{children}</div><div className="bt-center"><Link href="/products" className="bt-outline">Xem tất cả {brand.label.toLowerCase()}</Link></div></section>
    <section id="brand-story" className="bt-story" aria-labelledby="story-title"><div className="bt-story-image"><Image src="/images/editorial-hero.jpg" alt="" fill sizes="(max-width: 767px) 100vw, 50vw"/></div><div className="bt-story-copy"><p className="bt-eyebrow">CÂU CHUYỆN {brand.wordmark}</p><h2 id="story-title">{brand.story}</h2><p>{brand.storyText}</p><Link href="/products" className="bt-underline">Khám phá thêm</Link></div></section>
  </main>;
}
