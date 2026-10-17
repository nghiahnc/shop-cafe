"use client";

import { useMemo, useState } from "react";
import { DemoCardNote } from "@/components/DemoFields";
import type { DashboardData } from "@/lib/dashboard";
import type { shop as flowerShop } from "@/lib/config";

type ShopConfig = typeof flowerShop;
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
const status: Record<string, string> = { paid: "Đã thanh toán", pending: "Chờ thanh toán", cancelled: "Đã hủy", needs_review: "Cần kiểm tra" };

export default function Dashboard({ data, days, shop, stripeConfigured }: { data: DashboardData; days: number; shop: ShopConfig; stripeConfigured: boolean }) {
  const [productId, setProductId] = useState(String(data.products.find(p => p.stock > 0)?.id ?? ""));
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("Khách thử nghiệm");
  const [customerEmail, setCustomerEmail] = useState("demo@example.com");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = data.products.find((p) => String(p.id) === productId);
  const bars = useMemo(() => {
    const size = Math.ceil(data.dailySales.length / 14);
    const grouped = [];
    for (let i = 0; i < data.dailySales.length; i += size) {
      const slice = data.dailySales.slice(i, i + size);
      grouped.push({ label: slice[0].day.slice(5).replace("-", "/"), value: slice.reduce((sum, item) => sum + Number(item.revenue), 0) });
    }
    return grouped;
  }, [data.dailySales]);
  const maxBar = Math.max(...bars.map((bar) => bar.value), 1);

  async function createCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(productId), quantity, customerName, customerEmail }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Không thể tạo thanh toán");
      window.location.href = result.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
      setBusy(false);
    }
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">{shop.initials}</span><div><strong>{shop.name}</strong><small>STUDIO / ADMIN</small></div></div>
      <div className="side-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="nav"><a className="active" href="/admin"><span>▦</span> Tổng quan</a><a href="#analytics"><span>▥</span> Phân tích</a><a href="/admin/orders"><span>▤</span> Đơn hàng</a><a href="/admin/products"><span>◇</span> Sản phẩm & kho</a><a href="/admin/promotions"><span>%</span> Khuyến mãi</a><a href="/"><span>↗</span> Cửa hàng</a></nav>
      <div className="sidebar-bottom"><div className="support-icon">✦</div><strong>Bản demo cửa hàng</strong><p>Dữ liệu mẫu, thanh toán Stripe ở chế độ thử nghiệm.</p><div className="sidebar-pill"><span className="live-dot"/> Chế độ demo</div></div>
    </aside>
    <main className="main" id="overview">
      <header className="topbar"><div className="breadcrumb">WORKSPACE <span>/</span> <b>TỔNG QUAN</b></div><div className="top-actions"><span className="today">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><span className="avatar">AD</span></div></header>
      <div className="content">
        <section className="page-heading"><div><span className="eyebrow">BẢNG ĐIỀU KHIỂN / {shop.kind.toUpperCase()}</span><h1>Tổng quan cửa hàng<span className="heading-period">.</span></h1><p>Theo dõi mọi hoạt động kinh doanh của {shop.name} trong một nơi.</p></div><div className="period-switch" aria-label="Chọn khoảng thời gian">{[7,30,90].map((value) => <a key={value} className={days===value ? "selected" : ""} href={`/admin?days=${value}`}>{value} ngày</a>)}</div></section>
        <section className="hero"><img src={shop.heroImage} alt="Hình ảnh cửa hàng"/><div className="hero-shade"/><div className="hero-copy"><span className="hero-kicker">✦ &nbsp; {shop.accentLabel}</span><h2>{shop.tagline}</h2><p>Mỗi đơn hàng là một niềm vui. Cùng nhìn lại hành trình của cửa hàng hôm nay.</p><a href="#checkout">Tạo đơn thử <span>↗</span></a></div><div className="hero-counter">01 <span>/ 03</span></div></section>
        <section className="metric-grid" aria-label="Chỉ số kinh doanh">
          <Metric label="Doanh thu" value={money(data.revenue)} icon="↗" note={`Từ ${data.paidOrders} đơn đã thanh toán`} tone="main" />
          <Metric label="Đơn đã bán" value={String(data.paidOrders)} icon="◈" note={`Trong ${days} ngày gần đây`} />
          <Metric label="Giá trị trung bình" value={money(data.averageOrder)} icon="▥" note="Mỗi đơn đã thanh toán" />
          <Metric label="Cần xử lý" value={String(data.pendingOrders)} icon="◷" note={`${data.lowStock} sản phẩm sắp hết hàng`} />
        </section>
        <section className="analytics-grid" id="analytics"><div className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">HIỆU SUẤT</span><h3>Doanh thu theo thời gian</h3></div><div className="legend"><i/> Đơn đã thanh toán</div></div><div className="chart"><div className="chart-grid"><span>{money(maxBar)}</span><span>{money(Math.round(maxBar/2))}</span><span>0 ₫</span></div><div className="chart-bars">{bars.map((bar) => <div className="bar-column" key={bar.label} title={`${bar.label}: ${money(bar.value)}`}><div className="bar" style={{height: `${Math.max(5,bar.value/maxBar*100)}%`}}/><span>{bar.label}</span></div>)}</div></div></div><div className="panel top-panel"><div className="panel-head"><div><span className="eyebrow">YÊU THÍCH NHẤT</span><h3>Sản phẩm bán chạy</h3></div><span className="small-link">{days} ngày ↗</span></div><div className="top-list">{data.topProducts.map((product,index) => <div className="top-row" key={product.name}><span className="rank">{String(index+1).padStart(2,"0")}</span><img src={product.image_path} alt=""/><div><strong>{product.name}</strong><small>{product.quantity} đã bán</small></div><b>{money(product.revenue)}</b></div>)}</div></div></section>
        <section className="lower-grid"><div className="panel orders-panel" id="orders"><div className="panel-head"><div><span className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span><h3>Đơn hàng mới nhất</h3></div><span className="small-link">{data.recentOrders.length} đơn gần nhất</span></div><div className="table-wrap"><table><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>NGÀY</th><th>GIÁ TRỊ</th><th>TRẠNG THÁI</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order.id}><td className="order-code">{order.code}</td><td>{order.customer}</td><td>{date(order.placed_at)}</td><td className="money-cell">{money(order.total_vnd)}</td><td><span className={`status status-${order.status}`}>{status[order.status] ?? order.status}</span></td></tr>)}</tbody></table></div></div><div className="panel checkout-panel" id="checkout"><div className="panel-head"><div><span className="eyebrow">STRIPE SANDBOX</span><h3>Tạo đơn thử</h3></div><span className="checkout-icon">↗</span></div><p>Chọn sản phẩm để thử quy trình thanh toán. Không phát sinh tiền thật.</p><form onSubmit={createCheckout}><DemoCardNote/><label>Sản phẩm<select value={productId} onChange={(event) => setProductId(event.target.value)}>{data.products.filter((p) => p.stock>0).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price_vnd)}</option>)}</select></label><div className="form-row"><label>Số lượng<input type="number" min="1" max={Math.max(1,selected?.stock??1)} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/></label><label>Kho còn<input value={selected?.stock ?? 0} readOnly/></label></div><label>Tên khách<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required/></label><label>Email thử nghiệm<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required/></label><div className="checkout-total"><span>Tổng đơn</span><strong>{money((selected?.price_vnd??0)*quantity)}</strong></div><button type="submit" disabled={!stripeConfigured || busy || !selected}>{busy ? "Đang tạo..." : "Thanh toán thử ↗"}</button>{!stripeConfigured && <p className="form-note">Thêm <code>STRIPE_SECRET_KEY=sk_test_...</code> vào <code>.env.local</code> rồi khởi động lại.</p>}{message && <p className="form-error" role="alert">{message}</p>}</form></div></section>
        <section className="catalog-section" id="catalog"><div className="catalog-heading"><div><span className="eyebrow">DANH MỤC SẢN PHẨM</span><h3>Trong cửa hàng <span>({data.products.length})</span></h3></div><span className="small-link">Tồn kho cập nhật theo đơn đã bán</span></div><div className="product-grid">{data.products.map((product) => <div className="product-card" key={product.id}><div className="product-image"><img src={product.image_path} alt={product.name}/><span className="product-category">{product.category}</span></div><div className="product-info"><small>{product.sku}</small><strong>{product.name}</strong><div><b>{money(product.price_vnd)}</b><span className={product.stock<25 ? "stock-low" : ""}>{product.stock} còn</span></div></div></div>)}</div></section>
        <footer>© 2026 {shop.name} &nbsp;·&nbsp; Dashboard mẫu dùng PostgreSQL và Stripe Sandbox</footer>
      </div>
    </main>
  </div>;
}

function Metric({ label, value, icon, note, tone }: { label: string; value: string; icon: string; note: string; tone?: string }) {
  return <div className={`metric-card ${tone ?? ""}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{note}</small></div>;
}
