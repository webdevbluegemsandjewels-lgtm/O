-- One-time move: copies every gender = 'Men' row out of public.products
-- into public.mens_products, then removes them (and the now-unused
-- `gender` column) from public.products.
--
-- Run ONCE, in this order:
--   1. supabase_schema.sql        (adds the `gender` column)
--   2. supabase/seed_mens_products.sql  (backfills colors/material/
--      gold weight/price-breakup for gender='Men' rows, so they
--      arrive complete)
--   3. supabase/mens_schema.sql   (creates mens_products + friends)
--   4. THIS FILE
--
-- NOT idempotent in the usual sense — the insert re-running would
-- duplicate rows (mens_products.slug has a unique constraint, so a
-- second run will fail loudly on the insert rather than silently
-- double-inserting, which is the safer failure mode here). Re-running
-- after a successful first run is a no-op anyway since the source
-- rows (gender = 'Men') will already be gone.

insert into public.mens_products (
  slug, name, brand, category, price, currency, old_price, image,
  secondary_image, gallery, is_active, stock, source_url, description,
  colors, material, gold_type, gold_weight_grams, product_code,
  width_mm, thickness_mm, diamond_weight_ct, gold_share_pct,
  diamond_share_pct, making_share_pct, gst_share_pct, tag, rating,
  woo_parent_id, variant_size, variant_diamond_quality, created_at
)
select
  slug, name, brand, category, price, currency, old_price, image,
  secondary_image, gallery, is_active, stock, source_url, description,
  colors, material, gold_type, gold_weight_grams, product_code,
  width_mm, thickness_mm, diamond_weight_ct, gold_share_pct,
  diamond_share_pct, making_share_pct, gst_share_pct, tag, rating,
  woo_parent_id, variant_size, variant_diamond_quality, created_at
from public.products
where gender = 'Men';

delete from public.products where gender = 'Men';

-- No longer needed once every men's row has moved out of products.
alter table public.products drop column if exists gender;
