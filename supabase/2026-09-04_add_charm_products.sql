-- Added: 2026-09-04 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Adds 6 new "Charms" products, same shape/pattern as the 3 pendants
-- added in 2026-09-02_pendants_category.sql +
-- 2026-09-02_pendants_colors_variants.sql + 2026-09-02_pendants_product_code.sql:
--   - category = 'Charms' directly (the site's SHOP_CATS/CATEGORIES
--     now expect that exact string — see 2026-09-04_split_charms_pendants.sql)
--   - gold_weight_grams recorded as the 9kt weight given ("1gm for 9k"
--     etc.), no conversion, per the site's karat-weight convention
--   - all three colors (Rose/Yellow/White Gold) on each — "all 3 color
--     available"
--   - both diamond-quality options (GH-VS-SI / F-G-VVS-VS) — "both
--     diamond option" — sharing the same total diamond weight, only
--     the ₹/ct rate differs, GH-VS-SI is the default variant
--   - product_code set so product.html's Product Details/Price Break
--     Up panel shows (it's hidden whenever product_code is null)
--   - price snapshotted via calculate_product_price() at the end so
--     cards show a real bottom-up price immediately instead of
--     "Contact Us"; it'll drift with gold_rates same as every other
--     bottom-up product until the next snapshot or live-price read
--
-- image/secondary_image are left null on purpose — real photos will
-- be uploaded and the columns filled in by hand afterward (same
-- column, same idea as 2026-09-02_pendants_images.sql, just done
-- later this time instead of as a same-day follow-up migration).
-- product.html/js/main.js already null-guard a missing image (brown
-- placeholder background + a transparent-pixel fallback), so these
-- 6 render fine on the site with no image set.
-- =========================================================

insert into public.products (slug, name, brand, category, price, image, description, is_active, stock)
select v.slug, v.name, v.brand, v.category, v.price, v.image, v.description, v.is_active, v.stock
from (values
  ('gold-lucky-ladybug-diamond-charm',
   'Gold Lucky Ladybug Diamond Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'A playful ladybug charm crafted in pure gold with vibrant enamel accents and a sparkling natural diamond at its heart, symbolizing luck and joy.',
   true, 25),
  ('gold-diamond-bird-charm',
   'Gold Diamond Bird Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'A charming little bird crafted in pure gold with soft enamel details and brilliant natural diamonds, celebrating freedom, hope, and new beginnings.',
   true, 25),
  ('gold-diamond-hot-air-balloon-charm',
   'Gold Diamond Hot Air Balloon Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'A whimsical hot air balloon crafted in pure gold with pastel enamel and sparkling natural diamonds, inspired by dreams, adventure, and limitless possibilities.',
   true, 25),
  ('gold-smiling-cloud-diamond-charm',
   'Gold Smiling Cloud Diamond Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'A cheerful smiling cloud crafted in pure gold with soft enamel and sparkling natural diamonds, bringing happiness and positivity wherever it goes.',
   true, 25),
  ('gold-diamond-elephant-charm',
   'Gold Diamond Elephant Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'A graceful elephant charm crafted in pure gold with sparkling natural diamonds, representing wisdom, strength, and good fortune.',
   true, 25),
  ('gold-diamond-panda-charm',
   'Gold Diamond Panda Charm',
   'OrenkaFine Jewellery',
   'Charms',
   0::numeric,
   null::text,
   'An adorable panda charm crafted in pure gold with delicate enamel accents and sparkling natural diamonds, celebrating innocence and playful charm.',
   true, 25)
) as v(slug, name, brand, category, price, image, description, is_active, stock)
where not exists (select 1 from public.products p where p.slug = v.slug);

-- Gold weight (9kt baseline, as given) + colors (all 3 available)
update public.products set gold_weight_grams = 1.00,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-lucky-ladybug-diamond-charm';
update public.products set gold_weight_grams = 1.00,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-diamond-bird-charm';
update public.products set gold_weight_grams = 1.20,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-diamond-hot-air-balloon-charm';
update public.products set gold_weight_grams = 1.00,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-smiling-cloud-diamond-charm';
update public.products set gold_weight_grams = 1.00,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-diamond-elephant-charm';
update public.products set gold_weight_grams = 1.50,  colors = array['Rose Gold','Yellow Gold','White Gold'] where slug = 'gold-diamond-panda-charm';

-- Both diamond-quality options, same total ct per product (GH-VS-SI is default)
insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select p.id, v.quality, v.ct, (v.quality = 'GH-VS-SI')
from public.products p
join (
  values
    ('gold-lucky-ladybug-diamond-charm',    'GH-VS-SI',   0.04::numeric),
    ('gold-lucky-ladybug-diamond-charm',    'F-G-VVS-VS', 0.04::numeric),
    ('gold-diamond-bird-charm',             'GH-VS-SI',   0.07::numeric),
    ('gold-diamond-bird-charm',             'F-G-VVS-VS', 0.07::numeric),
    ('gold-diamond-hot-air-balloon-charm',  'GH-VS-SI',   0.12::numeric),
    ('gold-diamond-hot-air-balloon-charm',  'F-G-VVS-VS', 0.12::numeric),
    ('gold-smiling-cloud-diamond-charm',    'GH-VS-SI',   0.03::numeric),
    ('gold-smiling-cloud-diamond-charm',    'F-G-VVS-VS', 0.03::numeric),
    ('gold-diamond-elephant-charm',         'GH-VS-SI',   0.05::numeric),
    ('gold-diamond-elephant-charm',         'F-G-VVS-VS', 0.05::numeric),
    ('gold-diamond-panda-charm',            'GH-VS-SI',   0.02::numeric),
    ('gold-diamond-panda-charm',            'F-G-VVS-VS', 0.02::numeric)
) as v(slug, quality, ct)
  on v.slug = p.slug
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  is_default = excluded.is_default;

-- product.html hides the whole Product/Diamond/Metal/Price Break Up
-- block whenever product_code is null — same reason the pendants
-- needed 2026-09-02_pendants_product_code.sql.
update public.products set product_code = 'FE404' where slug = 'gold-lucky-ladybug-diamond-charm';
update public.products set product_code = 'FE405' where slug = 'gold-diamond-bird-charm';
update public.products set product_code = 'FE406' where slug = 'gold-diamond-hot-air-balloon-charm';
update public.products set product_code = 'FE407' where slug = 'gold-smiling-cloud-diamond-charm';
update public.products set product_code = 'FE408' where slug = 'gold-diamond-elephant-charm';
update public.products set product_code = 'FE409' where slug = 'gold-diamond-panda-charm';

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
    'gold-lucky-ladybug-diamond-charm',
    'gold-diamond-bird-charm',
    'gold-diamond-hot-air-balloon-charm',
    'gold-smiling-cloud-diamond-charm',
    'gold-diamond-elephant-charm',
    'gold-diamond-panda-charm'
  );
