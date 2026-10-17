CREATE TABLE IF NOT EXISTS cafe_product_details (
  product_id bigint PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  serving text NOT NULL
);
INSERT INTO cafe_product_details(product_id,serving)
SELECT id,serving FROM products WHERE serving IS NOT NULL
ON CONFLICT(product_id) DO NOTHING;
ALTER TABLE products DROP COLUMN IF EXISTS occasion;
ALTER TABLE products DROP COLUMN IF EXISTS flower_style;
ALTER TABLE products DROP COLUMN IF EXISTS serving;
ALTER TABLE products DROP COLUMN IF EXISTS apparel_size;
ALTER TABLE products DROP COLUMN IF EXISTS apparel_color;
