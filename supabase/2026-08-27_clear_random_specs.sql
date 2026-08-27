-- Added: 2026-08-27 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Clear randomly-seeded width_mm / thickness_mm.
--
-- seed_product_specs.sql (public.products) and seed_mens_products.sql
-- (public.mens_products) both backfilled these two columns with
-- random placeholder values for any row that didn't already have
-- one:
--   width_mm     = round((1.5 + random() * 4.5)::numeric, 1)
--   thickness_mm = round((1.0 + random() * 1.8)::numeric, 1)
--
-- There's no column marking which rows got a random value vs. a real
-- one, so this clears both columns across the board on both tables.
-- Real measurements will be entered by hand going forward.
--
-- product.html / product-men.html already hide the Width/Thickness
-- rows entirely whenever these are null (see updateSpecBreakup()),
-- so this just makes them disappear from the Price Break Up panel
-- until real values are added back per product.
-- =========================================================

update public.products
set width_mm = null, thickness_mm = null;

update public.mens_products
set width_mm = null, thickness_mm = null;
