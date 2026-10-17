import { getPool } from "./db";

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price_vnd: number;
  image_path: string;
  stock: number;
};
export type RecentOrder = {
  id: number;
  code: string;
  customer: string;
  status: string;
  total_vnd: number;
  placed_at: string;
};
export type DailySale = { day: string; revenue: number; orders: number };
export type TopProduct = { name: string; image_path: string; quantity: number; revenue: number };
export type DashboardData = {
  revenue: number;
  paidOrders: number;
  pendingOrders: number;
  averageOrder: number;
  lowStock: number;
  products: Product[];
  recentOrders: RecentOrder[];
  dailySales: DailySale[];
  topProducts: TopProduct[];
};

export async function getDashboard(days: number): Promise<DashboardData> {
  const db = getPool();
  const [metrics, products, recent, daily, top] = await Promise.all([
    db.query(`SELECT
      COALESCE(SUM(total_vnd) FILTER (WHERE status = 'paid'),0)::float8 AS revenue,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders
      FROM orders WHERE placed_at >= (((now() AT TIME ZONE 'Asia/Bangkok')::date - ($1::int - 1))::timestamp AT TIME ZONE 'Asia/Bangkok')`, [days]),
    db.query(`SELECT p.id::int, p.name, p.sku, c.name AS category,
      p.price_vnd::float8, p.image_path,
      (p.opening_stock + COALESCE(SUM(m.quantity_delta),0))::int AS stock
      FROM products p JOIN categories c ON c.id=p.category_id
      LEFT JOIN inventory_movements m ON m.product_id=p.id
      WHERE p.active=true
      GROUP BY p.id,c.name ORDER BY p.id`),
    db.query(`SELECT o.id::int,o.code,COALESCE(c.full_name,'Khách lẻ') AS customer,
      o.status,o.total_vnd::float8,o.placed_at::text
      FROM orders o LEFT JOIN customers c ON c.id=o.customer_id
      ORDER BY o.placed_at DESC,o.id DESC LIMIT 8`),
    db.query(`SELECT d.day::date::text AS day,
      COALESCE(SUM(o.total_vnd),0)::float8 AS revenue,
      COUNT(o.id)::int AS orders
      FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date - ($1::int - 1), (now() AT TIME ZONE 'Asia/Bangkok')::date, interval '1 day') AS d(day)
      LEFT JOIN orders o ON (o.placed_at AT TIME ZONE 'Asia/Bangkok')::date=d.day::date AND o.status='paid'
      GROUP BY d.day ORDER BY d.day`, [days]),
    db.query(`SELECT p.name,p.image_path,SUM(i.quantity)::int AS quantity,
      SUM(i.line_total_vnd)::float8 AS revenue
      FROM order_items i JOIN orders o ON o.id=i.order_id
      JOIN products p ON p.id=i.product_id
      WHERE o.status='paid' AND o.placed_at >= (((now() AT TIME ZONE 'Asia/Bangkok')::date - ($1::int - 1))::timestamp AT TIME ZONE 'Asia/Bangkok')
      GROUP BY p.id ORDER BY quantity DESC,p.id LIMIT 5`, [days]),
  ]);
  const revenue = Number(metrics.rows[0].revenue);
  const paidOrders = Number(metrics.rows[0].paid_orders);
  return {
    revenue,
    paidOrders,
    pendingOrders: Number(metrics.rows[0].pending_orders),
    averageOrder: paidOrders ? Math.round(revenue / paidOrders) : 0,
    lowStock: products.rows.filter((p) => Number(p.stock) < 25).length,
    products: products.rows,
    recentOrders: recent.rows,
    dailySales: daily.rows,
    topProducts: top.rows,
  };
}
