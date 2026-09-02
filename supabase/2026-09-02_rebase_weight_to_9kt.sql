-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Flips the karat weight-scaling reference from 18kt to 9kt:
-- gold_weight_grams is now treated as the 9kt weight (1gm baseline),
-- and 14kt/18kt scale UP from there (denser alloy, same design
-- volume weighs more), instead of 18kt being the baseline that
-- 14kt/9kt scaled down from. Same relative density ratios as before
-- (18kt:14kt:9kt = 1 : 0.85 : 0.75), just rebased so 9kt = 1:
--   9kt:  1
--   14kt: 0.85/0.75 = 17/15  (~1.1333)
--   18kt: 1/0.75    = 4/3   (~1.3333)
-- Safe to re-run.
-- =========================================================

create or replace function public.calculate_product_price(
  p_product_id uuid,
  p_karat text default '18kt',
  p_variant_id uuid default null,
  p_size_id uuid default null
)
returns table (
  gold_cost numeric,
  diamond_cost numeric,
  making_charge numeric,
  gst numeric,
  subtotal numeric,
  final_price numeric,
  is_calculated boolean
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_weight numeric;
  v_diamond_ct numeric;
  v_diamond_quality text;
  v_gold_rate numeric;
  v_purity numeric;
  v_diamond_rate numeric;
  v_making_rate numeric;
  v_gst_pct numeric;
begin
  if p_size_id is not null and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'product_sizes'
  ) then
    execute 'select ps.gold_weight_grams from public.product_sizes ps where ps.id = $1 and ps.product_id = $2'
      into v_weight using p_size_id, p_product_id;
  else
    select p.gold_weight_grams into v_weight
    from public.products p where p.id = p_product_id;
  end if;

  if p_variant_id is not null then
    select pv.diamond_weight_ct, pv.diamond_quality into v_diamond_ct, v_diamond_quality
    from public.product_variants pv
    where pv.id = p_variant_id and pv.product_id = p_product_id;
  else
    select p.diamond_weight_ct, p.variant_diamond_quality into v_diamond_ct, v_diamond_quality
    from public.products p where p.id = p_product_id;
  end if;

  if v_weight is null then
    return query select null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, false;
    return;
  end if;

  select gr.rate_24kt_per_10g into v_gold_rate from public.gold_rates gr where gr.id = 1;
  select ps.making_charge_per_gram, ps.gst_percent into v_making_rate, v_gst_pct
  from public.pricing_settings ps where ps.id = 1;

  if v_gold_rate is null or v_making_rate is null or v_gst_pct is null then
    return query select null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, false;
    return;
  end if;

  v_purity := case p_karat
    when '9kt' then 0.42
    when '14kt' then 0.61
    else 0.77
  end;

  v_weight := v_weight * case p_karat
    when '18kt' then 4.0 / 3.0
    when '14kt' then 17.0 / 15.0
    else 1
  end;

  v_diamond_rate := 0;
  if v_diamond_quality is not null then
    select coalesce(dr.rate_per_ct, 0) into v_diamond_rate
    from public.diamond_rates dr where dr.quality = v_diamond_quality;
  end if;

  gold_cost := v_weight * v_purity * (v_gold_rate / 10);
  diamond_cost := coalesce(v_diamond_ct, 0) * v_diamond_rate;
  making_charge := v_making_rate;
  subtotal := gold_cost + diamond_cost + making_charge;
  gst := subtotal * (v_gst_pct / 100);
  final_price := subtotal + gst;
  is_calculated := true;
  return next;
end;
$$;
