-- Run this once in Supabase Dashboard → SQL Editor.
-- =========================================================
-- Gives "Pure Gold Trishul Diamond Bracelet" real per-size gold
-- weight rows, sizes 6 / 6.5 / 7 — same sizing and the same +5%
-- weight step pattern as "Diamond Shree Gold Bracelet"
-- (supabase_schema.sql), just scaled off this product's own base
-- weight (1.00g at size 6, vs Diamond Shree's 2.00g) instead of
-- reusing Diamond Shree's absolute grams:
--   6    -> 1.00g (base, matches products.gold_weight_grams)
--   6.5  -> 1.05g (+5%)
--   7    -> 1.10g (+10%, i.e. +5% again over 6.5)
--
-- Once these rows exist, both product.html and crm-dashboard.html's
-- quote tool automatically pick them up (real product_sizes rows take
-- priority over the generic size-fallback list) and price the size
-- picker exactly, the same way Diamond Shree Gold Bracelet already
-- does — no other code change needed for this product.
-- Safe to re-run.
-- =========================================================

insert into public.product_sizes (product_id, size, gold_weight_grams, is_default)
select p.id, v.size, v.weight, (v.size = '6')
from public.products p
join (
  values
    ('6', 1.00::numeric),
    ('6.5', 1.05::numeric),
    ('7', 1.10::numeric)
) as v(size, weight)
  on true
where p.slug = 'diamond-trishul-gold-bracelet'
on conflict (product_id, size) do update set
  gold_weight_grams = excluded.gold_weight_grams,
  is_default = excluded.is_default;
