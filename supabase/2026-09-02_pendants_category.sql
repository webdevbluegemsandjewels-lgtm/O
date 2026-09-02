-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- 3 new "Charms & Pendants" products (category already recognized by
-- collections.html's SHOP_CATS list — no frontend changes needed,
-- they'll show up under that filter automatically once inserted).
--
-- gold_weight_grams is recorded as the 9kt weight, per the site's
-- current karat-weight convention (see 2026-09-02_rebase_weight_to_9kt.sql)
-- — matches what was given ("2gm for 9k", etc.) directly, no conversion.
--
-- image paths below are placeholders (Products/<slug>.png) — upload
-- the real photos to the Images storage bucket under those exact
-- names, or update the `image` column afterward, before these look
-- right on the site.
--
-- Price is snapshotted via calculate_product_price() at the end of
-- this script so the cards show a real bottom-up price immediately;
-- it'll drift once gold_rates changes until the next live-price read
-- (get_live_product_prices(), used by the card grid) or another
-- snapshot run — same as every other bottom-up product.
-- =========================================================

insert into public.products (slug, name, brand, category, price, image, description, is_active, stock)
select v.slug, v.name, v.brand, v.category, v.price, v.image, v.description, v.is_active, v.stock
from (values
  ('gold-rudraksha-diamond-pendant',
   'Gold Rudraksha Diamond Pendant',
   'OrenkaFine Jewellery',
   'Charms & Pendants',
   0::numeric,
   'Products/gold-rudraksha-diamond-pendant.png',
   'Gracefully crafted in gold and embellished with natural diamonds, this Rudraksha-inspired pendant embodies faith, elegance, and timeless beauty.',
   true, 25),
  ('gold-ganesha-heart-diamond-pendant',
   'Gold Ganesha Heart Diamond Pendant',
   'OrenkaFine Jewellery',
   'Charms & Pendants',
   0::numeric,
   'Products/gold-ganesha-heart-diamond-pendant.png',
   'A timeless symbol of faith and love, this gold Ganesha Heart Pendant is delicately adorned with natural diamonds for an elegant finish.',
   true, 25),
  ('gold-ganesha-trunk-diamond-pendant',
   'Gold Ganesha Trunk Diamond Pendant',
   'OrenkaFine Jewellery',
   'Charms & Pendants',
   0::numeric,
   'Products/gold-ganesha-trunk-diamond-pendant.png',
   'A refined expression of devotion, this gold Ganesha Trunk Pendant features a graceful abstract design enhanced with natural diamonds for everyday elegance.',
   true, 25)
) as v(slug, name, brand, category, price, image, description, is_active, stock)
where not exists (select 1 from public.products p where p.slug = v.slug);

-- Gold weight (9kt baseline) + default diamond quality/weight, same
-- pattern as the existing named-product spec block above.
update public.products set
  gold_weight_grams = 2.00,
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.03
where slug = 'gold-rudraksha-diamond-pendant';

update public.products set
  gold_weight_grams = 2.00,
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.04
where slug = 'gold-ganesha-heart-diamond-pendant';

update public.products set
  gold_weight_grams = 1.50,
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.06
where slug = 'gold-ganesha-trunk-diamond-pendant';

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select p.id, v.quality, v.ct, true
from public.products p
join (
  values
    ('gold-rudraksha-diamond-pendant', 'GH-VS-SI', 0.03::numeric),
    ('gold-ganesha-heart-diamond-pendant', 'GH-VS-SI', 0.04::numeric),
    ('gold-ganesha-trunk-diamond-pendant', 'GH-VS-SI', 0.06::numeric)
) as v(slug, quality, ct)
  on v.slug = p.slug
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  is_default = excluded.is_default;

-- Snapshot a real starting price (9kt, default variant) so the cards
-- don't show ₹0 / "Contact Us" until the next live-price read.
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
