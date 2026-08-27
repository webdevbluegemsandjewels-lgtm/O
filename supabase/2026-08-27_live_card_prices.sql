-- Added: 2026-08-27 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Live prices for card grids (index.html, collections.html, etc.)
--
-- product.html already computes a live price via
-- calculate_product_price() (18kt + default diamond variant/size).
-- Card grids instead read products.price directly — a manually
-- re-run snapshot (see supabase_schema.sql's "Snapshot the real
-- bottom-up price" section) that goes stale the moment gold_rates
-- changes (e.g. from the hourly update-gold-rate edge function).
--
-- This function computes the same 18kt/default-variant price for
-- EVERY active product in one set-based query, so js/products-db.js
-- can show a live price on cards too, matching the product page,
-- without needing to re-run a snapshot UPDATE by hand.
--
-- Depends on: calculate_product_price() (2026-08-27_pricing_fix.sql).
-- Run that first if you haven't.
-- =========================================================

create or replace function public.get_live_product_prices()
returns table (product_id uuid, final_price numeric)
language sql
stable
security definer
set search_path = public
as $$
  select p.id as product_id, c.final_price
  from public.products p
  left join public.product_variants pv on pv.product_id = p.id and pv.is_default = true
  left join public.product_sizes ps on ps.product_id = p.id and ps.is_default = true
  cross join lateral public.calculate_product_price(p.id, '18kt', pv.id, ps.id) c
  where p.is_active = true
    and c.is_calculated = true;
$$;

grant execute on function public.get_live_product_prices() to anon, authenticated;
