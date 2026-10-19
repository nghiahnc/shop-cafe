import Image from 'next/image';
import Link from 'next/link';
import type { CatalogProduct } from '@/modules/catalog/repository';
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
export default function ProductCard({ product }: { product: CatalogProduct }) {
 return <article className="store-product-card"><Link href={`/products/${product.slug}`} className="store-product-photo"><Image src={product.image_path} alt={product.name} width={900} height={1100} sizes="(max-width: 767px) 50vw, 25vw"/><span>{product.is_drink ? product.serving : 'Ăn nhẹ'}</span></Link><div className="store-product-details"><small>{product.category}</small><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><p>{product.description}</p><div className="store-product-bottom"><strong>{product.is_drink ? 'Từ ' : ''}{money(product.is_drink ? product.price_vnd + product.size_s_delta_vnd : product.price_vnd)}</strong>{product.stock > 0 ? <Link className="bt-product-action" href={`/products/${product.slug}`}>{product.is_drink ? 'Chọn món' : 'Xem món'}</Link> : <span className="bt-sold-out">Hết món</span>}</div></div></article>;
}
