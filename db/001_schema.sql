CREATE TABLE IF NOT EXISTS categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_vnd bigint NOT NULL CHECK (price_vnd > 0),
  opening_stock integer NOT NULL CHECK (opening_stock >= 0),
  image_path text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);

CREATE TABLE IF NOT EXISTS customers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  customer_id bigint REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending','paid','cancelled','needs_review')),
  source text NOT NULL CHECK (source IN ('seed','stripe')),
  total_vnd bigint NOT NULL CHECK (total_vnd >= 0),
  placed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_placed_idx ON orders(status, placed_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  unit_price_vnd bigint NOT NULL CHECK (unit_price_vnd > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_vnd bigint NOT NULL CHECK (line_total_vnd = unit_price_vnd * quantity)
);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);

CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('seed','stripe')),
  status text NOT NULL CHECK (status IN ('pending','paid','failed','expired')),
  amount_vnd bigint NOT NULL CHECK (amount_vnd >= 0),
  charge_currency text,
  charge_amount bigint CHECK (charge_amount >= 0),
  demo_rate_vnd_per_usd integer CHECK (demo_rate_vnd_per_usd > 0),
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  order_id bigint REFERENCES orders(id) ON DELETE RESTRICT,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  reason text NOT NULL CHECK (reason IN ('sale','adjustment')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id, reason)
);
CREATE INDEX IF NOT EXISTS inventory_product_idx ON inventory_movements(product_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
