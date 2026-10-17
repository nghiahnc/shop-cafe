ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;
UPDATE products SET slug=lower(sku) WHERE slug IS NULL;
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products(slug);

CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text,
  google_sub text UNIQUE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cafe_options (
  product_id bigint PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  is_drink boolean NOT NULL,
  size_s_delta_vnd bigint NOT NULL DEFAULT -5000,
  size_l_delta_vnd bigint NOT NULL DEFAULT 10000,
  CHECK (size_s_delta_vnd BETWEEN -100000 AND 100000),
  CHECK (size_l_delta_vnd BETWEEN -100000 AND 100000)
);
INSERT INTO cafe_options(product_id,is_drink)
SELECT p.id, c.slug <> 'banh-ngot' FROM products p JOIN categories c ON c.id=p.category_id
ON CONFLICT (product_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS promotions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('code','automatic')),
  code text UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value bigint NOT NULL CHECK (discount_value > 0),
  min_subtotal_vnd bigint NOT NULL DEFAULT 0 CHECK (min_subtotal_vnd >= 0),
  max_uses integer CHECK (max_uses > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK ((mode='code' AND code IS NOT NULL) OR (mode='automatic' AND code IS NULL)),
  CHECK (discount_type <> 'percent' OR discount_value <= 100)
);
CREATE INDEX IF NOT EXISTS promotions_active_idx ON promotions(active,starts_at,ends_at);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'new';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_vnd bigint;
UPDATE orders SET subtotal_vnd=total_vnd WHERE subtotal_vnd IS NULL;
ALTER TABLE orders ALTER COLUMN subtotal_vnd SET NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_vnd bigint NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_id bigint REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check CHECK (source IN ('seed','stripe','web'));
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_method_check CHECK (fulfillment_method IN ('delivery','pickup'));
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check CHECK (fulfillment_status IN ('new','confirmed','preparing','ready','shipping','completed','cancelled'));
ALTER TABLE orders ADD CONSTRAINT orders_totals_check CHECK (subtotal_vnd >= 0 AND discount_vnd >= 0 AND total_vnd = subtotal_vnd-discount_vnd);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,placed_at DESC);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('seed','stripe','cod','pickup_cash','promo'));
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_reason_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_reason_check CHECK (reason IN ('sale','adjustment','reserve','release'));

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promotion_id bigint NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  order_id bigint NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promotion_redemptions_promotion_idx ON promotion_redemptions(promotion_id);
