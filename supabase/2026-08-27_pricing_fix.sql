-- Added: 2026-08-27 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Bottom-up jewelry pricing fix: making charge = ₹3,000/gram,
-- GST = 3% of (gold + diamond + making).
--
-- Pulled out of supabase_schema.sql (its "Bottom-up jewelry pricing"
-- section, added 2026-08-26) as the minimal, self-contained piece
-- needed to fix product.html's Price Break Up showing an illustrative
-- percentage split instead of the real formula. Depends only on
-- public.products and public.gold_rates, both already confirmed live
-- (2026-07-23 section, marked RUN). Safe to re-run — every statement
-- is idempotent (create table if not exists / on conflict do update).
--
-- After running this, product.html's calculate_product_price() RPC
-- calls will start returning is_calculated = true for any product
-- that has gold_weight_grams set, and Making/GST on that product's
-- page will switch from the old percentage split to the real numbers.
-- =========================================================

create table if not exists public.diamond_rates (
  quality text primary key,
  rate_per_ct numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.diamond_rates enable row level security;

drop policy if exists "Diamond rates are viewable by everyone" on public.diamond_rates;
create policy "Diamond rates are viewable by everyone"
  on public.diamond_rates for select
  using (true);

insert into public.diamond_rates (quality, rate_per_ct)
values
  ('GH-VS-SI', 75000),
  ('F-G-VVS-VS', 95000)
on conflict (quality) do update set
  rate_per_ct = excluded.rate_per_ct,
  updated_at = now();

create table if not exists public.pricing_settings (
  id int primary key,
  making_charge_per_gram numeric not null,
  gst_percent numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.pricing_settings enable row level security;

drop policy if exists "Pricing settings are viewable by everyone" on public.pricing_settings;
create policy "Pricing settings are viewable by everyone"
  on public.pricing_settings for select
  using (true);

insert into public.pricing_settings (id, making_charge_per_gram, gst_percent)
values (1, 3000, 3)
on conflict (id) do update set
  making_charge_per_gram = excluded.making_charge_per_gram,
  gst_percent = excluded.gst_percent,
  updated_at = now();

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  diamond_quality text references public.diamond_rates(quality),
  diamond_weight_ct numeric,
  diamond_count integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create unique index if not exists product_variants_product_quality_uidx on public.product_variants(product_id, diamond_quality);

alter table public.product_variants enable row level security;

drop policy if exists "Product variants are viewable by everyone" on public.product_variants;
create policy "Product variants are viewable by everyone"
  on public.product_variants for select
  using (true);

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select id, variant_diamond_quality, diamond_weight_ct, true
from public.products
where diamond_weight_ct is not null
  and variant_diamond_quality is not null
  and not exists (
    select 1 from public.product_variants pv where pv.product_id = products.id
  );

drop function if exists public.calculate_product_price(uuid, text, uuid);

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
    when '9kt' then 0.375
    when '14kt' then 0.585
    else 0.750
  end;

  v_diamond_rate := 0;
  if v_diamond_quality is not null then
    select coalesce(dr.rate_per_ct, 0) into v_diamond_rate
    from public.diamond_rates dr where dr.quality = v_diamond_quality;
  end if;

  gold_cost := v_weight * v_purity * (v_gold_rate / 10);
  diamond_cost := coalesce(v_diamond_ct, 0) * v_diamond_rate;
  making_charge := v_weight * v_making_rate;
  subtotal := gold_cost + diamond_cost + making_charge;
  gst := subtotal * (v_gst_pct / 100);
  final_price := subtotal + gst;
  is_calculated := true;
  return next;
end;
$$;

grant execute on function public.calculate_product_price(uuid, text, uuid, uuid) to anon, authenticated;
