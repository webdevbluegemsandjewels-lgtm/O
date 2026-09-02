-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- product.html hides the whole "Product Details / Diamond Details /
-- Metal Details / Price Break Up" block whenever product.product_code
-- is null (see updateSpecBreakup() in product.html) — that's the only
-- reason the pendants weren't showing it, same template as every
-- other real product. Diamond/Metal/Price figures come from the real
-- calculate_product_price() breakdown already wired up for these
-- three, not the illustrative *_share_pct columns, so setting
-- product_code is the only change needed here.
-- =========================================================

update public.products set product_code = 'FE401' where slug = 'gold-rudraksha-diamond-pendant';
update public.products set product_code = 'FE402' where slug = 'gold-ganesha-heart-diamond-pendant';
update public.products set product_code = 'FE403' where slug = 'gold-ganesha-trunk-diamond-pendant';
