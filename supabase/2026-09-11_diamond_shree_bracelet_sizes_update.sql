-- Run this once in Supabase Dashboard → SQL Editor.
-- =========================================================
-- Updates "Diamond Shree Gold Bracelet"'s per-size gold weight rows
-- (originally seeded in supabase_schema.sql at 2.00 / 2.10 / 2.20):
--   6    -> 2.00g (unchanged, base)
--   6.5  -> 2.05g (was 2.10g)
--   7    -> 2.10g (was 2.20g)
-- Safe to re-run.
-- =========================================================

update public.product_sizes ps
set gold_weight_grams = v.weight
from public.products p
join (
  values
    ('6.5', 2.05::numeric),
    ('7', 2.10::numeric)
) as v(size, weight)
  on true
where ps.product_id = p.id
  and p.name = 'Diamond Shree Gold Bracelet'
  and ps.size = v.size;
