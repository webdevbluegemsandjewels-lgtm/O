-- Added: 2026-09-04 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Fixes the "Diamond Details" box (Weight: X ct) being missing on
-- product.html for the 6 charm products and the Trishul bracelet.
--
-- Root cause: product.html's specDiamondCol only checks the
-- top-level products.diamond_weight_ct column directly:
--   if (product.has_diamond && product.diamond_weight_ct) { ... }
-- 2026-09-04_add_charm_products.sql and
-- 2026-09-04_add_trishul_diamond_bracelet.sql both set the diamond
-- weight on the product_variants rows (used for the Diamond Type &
-- Quality picker + live price calc) but never copied it onto the
-- products row itself — unlike the pendants, which had it set
-- directly in 2026-09-02_pendants_category.sql. Everything else
-- (product_variants, colors, product_code, price) was already
-- correct; this is the one column that was missed.
--
-- variant_diamond_quality is set too, matching the same pendants
-- pattern, even though it only matters as a fallback default before
-- the real product_variants list loads.
-- =========================================================

update public.products set diamond_weight_ct = 0.04, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-lucky-ladybug-diamond-charm';
update public.products set diamond_weight_ct = 0.07, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-diamond-bird-charm';
update public.products set diamond_weight_ct = 0.12, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-diamond-hot-air-balloon-charm';
update public.products set diamond_weight_ct = 0.03, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-smiling-cloud-diamond-charm';
update public.products set diamond_weight_ct = 0.05, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-diamond-elephant-charm';
update public.products set diamond_weight_ct = 0.02, variant_diamond_quality = 'GH-VS-SI' where slug = 'gold-diamond-panda-charm';
update public.products set diamond_weight_ct = 0.05, variant_diamond_quality = 'GH-VS-SI' where slug = 'diamond-trishul-gold-bracelet';
