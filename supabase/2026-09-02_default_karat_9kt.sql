-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Card grids (index.html, collections.html, mens-collection.html)
-- now show the 9kt price by default instead of 18kt, matching the
-- product page's new default Metal Type selection.
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
  cross join lateral public.calculate_product_price(p.id, '9kt', pv.id, ps.id) c
  where p.is_active = true
    and c.is_calculated = true;
$$;
