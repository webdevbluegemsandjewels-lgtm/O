-- Added: 2026-09-04 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Adds 1 new "Bracelets" product, same shape/pattern as
-- 2026-09-04_add_charm_products.sql (and the pendants migrations
-- before it):
--   - brand = 'OrenkaFine' (generic), matching its sibling
--     "Diamond Shree Gold Bracelet" (same religious-symbol line as
--     the Trishul/Om/Damru gold studs already on the site)
--   - gold_weight_grams = 1.00 (the "1gm for 9k" given), no conversion
--   - all three colors (Rose/Yellow/White Gold) — "all colors"
--   - both diamond-quality options (GH-VS-SI / F-G-VVS-VS) — "both
--     diamond", same 0.05ct total, only the ₹/ct rate differs,
--     GH-VS-SI is the default variant
--   - product_code = 'FE410' (next after FE404-409 used by the 6
--     charm products) so product.html's Price Break Up panel shows
--   - price snapshotted via calculate_product_price() at the end,
--     same formula every other bottom-up product uses
--   - image/secondary_image left null on purpose — real photos to be
--     added by hand afterward, same as the charm products migration
-- =========================================================

insert into public.products (slug, name, brand, category, price, image, description, is_active, stock)
select v.slug, v.name, v.brand, v.category, v.price, v.image, v.description, v.is_active, v.stock
from (values
  ('diamond-trishul-gold-bracelet',
   'Pure Gold Trishul Diamond Bracelet',
   'OrenkaFine',
   'Bracelets',
   0::numeric,
   null::text,
   'A sacred Shiva trident design crafted in pure gold and centred with a sparkling natural diamond.',
   true, 25)
) as v(slug, name, brand, category, price, image, description, is_active, stock)
where not exists (select 1 from public.products p where p.slug = v.slug);

update public.products set
  gold_weight_grams = 1.00,
  colors = array['Rose Gold','Yellow Gold','White Gold']
where slug = 'diamond-trishul-gold-bracelet';

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select p.id, v.quality, v.ct, (v.quality = 'GH-VS-SI')
from public.products p
join (
  values
    ('diamond-trishul-gold-bracelet', 'GH-VS-SI',   0.05::numeric),
    ('diamond-trishul-gold-bracelet', 'F-G-VVS-VS', 0.05::numeric)
) as v(slug, quality, ct)
  on v.slug = p.slug
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  is_default = excluded.is_default;

update public.products set product_code = 'FE410' where slug = 'diamond-trishul-gold-bracelet';

update public.products p
set price = sub.final_price
from (
  select pv.product_id, c.final_price
  from public.product_variants pv,
       lateral calculate_product_price(pv.product_id, '9kt', pv.id) c
  where pv.is_default = true
    and c.is_calculated = true
) sub
where sub.product_id = p.id
  and p.slug = 'diamond-trishul-gold-bracelet';
