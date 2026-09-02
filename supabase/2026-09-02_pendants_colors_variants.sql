-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Follow-up to 2026-09-02_pendants_category.sql:
--   - all three colors (Rose/Yellow/White Gold) on each pendant
--   - both diamond-quality options (GH-VS-SI / F-G-VVS-VS), same
--     pattern as the other named products — both qualities share the
--     same total diamond weight, only the ₹/ct rate differs
--   - re-snapshot price afterward so it reflects the real formula,
--     not "Contact Us" (is_calculated should already have been true
--     from the first migration, but this makes sure)
-- No size dimension for pendants — that's a product.html display fix
-- (category-based Size-section logic), not a database change.
-- =========================================================

update public.products set
  colors = array['Rose Gold','Yellow Gold','White Gold']
where slug in (
  'gold-rudraksha-diamond-pendant',
  'gold-ganesha-heart-diamond-pendant',
  'gold-ganesha-trunk-diamond-pendant'
);

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select p.id, v.quality, v.ct, (v.quality = 'GH-VS-SI')
from public.products p
join (
  values
    ('gold-rudraksha-diamond-pendant', 'GH-VS-SI', 0.03::numeric),
    ('gold-rudraksha-diamond-pendant', 'F-G-VVS-VS', 0.03::numeric),
    ('gold-ganesha-heart-diamond-pendant', 'GH-VS-SI', 0.04::numeric),
    ('gold-ganesha-heart-diamond-pendant', 'F-G-VVS-VS', 0.04::numeric),
    ('gold-ganesha-trunk-diamond-pendant', 'GH-VS-SI', 0.06::numeric),
    ('gold-ganesha-trunk-diamond-pendant', 'F-G-VVS-VS', 0.06::numeric)
) as v(slug, quality, ct)
  on v.slug = p.slug
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  is_default = excluded.is_default;

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
  and p.slug in (
    'gold-rudraksha-diamond-pendant',
    'gold-ganesha-heart-diamond-pendant',
    'gold-ganesha-trunk-diamond-pendant'
  );
