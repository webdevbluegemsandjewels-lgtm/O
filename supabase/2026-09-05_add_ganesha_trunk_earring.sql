-- Added: 2026-09-05 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Adds 1 new "Earrings" product, same shape/pattern as
-- 2026-09-04_add_trishul_diamond_bracelet.sql and
-- 2026-09-04_add_charm_products.sql before it:
--   - brand = 'OrenkaFine' (generic), matching its sibling
--     "Diamond Trishul/Om/Damru Gold Stud Earrings" (same
--     religious-symbol line already on the site)
--   - gold_weight_grams = 1.00 (the "1gm for 9k" given), no conversion
--   - all three colors (Rose/Yellow/White Gold)
--   - both diamond-quality options (GH-VS-SI / F-G-VVS-VS), same
--     0.05ct total, only the ₹/ct rate differs, GH-VS-SI is the
--     default variant
--   - product_code = 'FE470' so product.html's Price Break Up panel
--     shows — this was the actual bug in the draft this was copied
--     from: the product_code UPDATE still targeted the old
--     'diamond-trishul-gold-bracelet' slug instead of this product's
--     own slug, so product_code was left null here and the whole
--     Product/Diamond/Metal/Price Break Up block stayed hidden on
--     product.html (same failure mode 2026-09-04_fix_charm_bracelet_diamond_weight.sql
--     fixed for the charms). Fixed below — every UPDATE now targets
--     'pure-gold-ganesha-trunk-diamond'.
--   - price snapshotted via calculate_product_price() at the end,
--     same formula every other bottom-up product uses
--   - image/secondary_image left null on purpose — real photos to be
--     added by hand afterward, same as the other recent migrations
-- =========================================================

insert into public.products (slug, name, brand, category, price, image, description, is_active, stock)
select v.slug, v.name, v.brand, v.category, v.price, v.image, v.description, v.is_active, v.stock
from (values
  ('pure-gold-ganesha-trunk-diamond',
   'Pure Gold Ganesha Trunk',
   'OrenkaFine',
   'Earrings',
   0::numeric,
   null::text,
   'A sacred, elegant design in pure gold accented with a sparkling natural diamond.',
   true, 25)
) as v(slug, name, brand, category, price, image, description, is_active, stock)
where not exists (select 1 from public.products p where p.slug = v.slug);

update public.products set
  gold_weight_grams = 1.00,
  colors = array['Rose Gold','Yellow Gold','White Gold']
where slug = 'pure-gold-ganesha-trunk-diamond';

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select p.id, v.quality, v.ct, (v.quality = 'GH-VS-SI')
from public.products p
join (
  values
    ('pure-gold-ganesha-trunk-diamond', 'GH-VS-SI',   0.05::numeric),
    ('pure-gold-ganesha-trunk-diamond', 'F-G-VVS-VS', 0.05::numeric)
) as v(slug, quality, ct)
  on v.slug = p.slug
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  is_default = excluded.is_default;

-- diamond_weight_ct set directly on the products row too, same as the
-- variant above — this is what product.html's "Natural Diamond
-- Details" box actually reads (see 2026-09-04_fix_charm_bracelet_diamond_weight.sql
-- for the same fix applied to the charms/Trishul bracelet).
update public.products set
  diamond_weight_ct = 0.05,
  variant_diamond_quality = 'GH-VS-SI',
  product_code = 'FE470'
where slug = 'pure-gold-ganesha-trunk-diamond';

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
  and p.slug = 'pure-gold-ganesha-trunk-diamond';
