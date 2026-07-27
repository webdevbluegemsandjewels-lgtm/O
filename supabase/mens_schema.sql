-- Men's catalog — dedicated tables, parallel to products / cart_items /
-- reviews / order_items rather than a `gender` column on the shared
-- tables. Run this once in the Supabase Dashboard SQL Editor
-- (service_role context). Safe to re-run (guarded with "if not
-- exists" / "drop policy if exists").
--
-- Run order: this file -> supabase/migrate_mens_products.sql (moves
-- the gender='Men' rows already seeded in public.products over into
-- mens_products, then drops them + the gender column from products).
--
-- Why separate tables instead of a `gender` column: see
-- supabase_schema.sql's 2026-07-27 entry for the column that was
-- scaffolded first — superseded by this file per the decision to
-- keep men's and women's catalogs fully independent (own table, own
-- product-detail page, own cart/review/order-item rows), while still
-- sharing one `orders` header row and one cart/checkout UI (js/cart.js
-- routes to the right table based on an item's `source`).

-- =========================================================
-- mens_products — same column shape as public.products, minus
-- `gender` (every row here is implicitly a men's product).
-- =========================================================

create table if not exists public.mens_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  brand text,
  category text,
  price numeric,
  currency text not null default 'INR',
  old_price numeric,
  image text,
  secondary_image text,
  gallery text[],
  is_active boolean not null default true,
  stock integer,
  source_url text,
  description text,
  colors text[],
  material text,
  gold_type text,
  gold_weight_grams numeric,
  product_code text,
  width_mm numeric,
  thickness_mm numeric,
  diamond_weight_ct numeric,
  gold_share_pct numeric,
  diamond_share_pct numeric,
  making_share_pct numeric,
  gst_share_pct numeric,
  tag text,
  rating numeric,
  woo_parent_id text,
  variant_size text,
  variant_diamond_quality text,
  created_at timestamptz not null default now()
);

-- Filter-sidebar facets (see supabase/seed_mens_filters.sql — all
-- derived from name+description keyword matching, mirroring the
-- Gabriel & Co men's-jewelry filter taxonomy). `category` above is
-- also re-derived by that script into this taxonomy's finer-grained
-- values (Bangles/Cross Pendants/Pendants/Pins/etc.), superseding
-- the broader buckets scrape-gabriel-mens.js's categorize() used.
--
-- Added as explicit alter-table statements (not just columns in the
-- create table above) so they still get added the second time this
-- file runs against a database where mens_products already exists
-- from an earlier run — "create table if not exists" is a no-op on
-- an existing table and would otherwise silently skip them.
alter table public.mens_products add column if not exists style text;
alter table public.mens_products add column if not exists metal text;
alter table public.mens_products add column if not exists stone_color text;
alter table public.mens_products add column if not exists gemstone text[];
alter table public.mens_products add column if not exists birthstone_month text;
alter table public.mens_products add column if not exists design_element text[];
alter table public.mens_products add column if not exists significance text[];
alter table public.mens_products add column if not exists enamel_color text;
alter table public.mens_products add column if not exists collection text;
alter table public.mens_products add column if not exists division text;

-- Same rule as products.has_diamond (supabase_schema.sql): derived
-- automatically from the name, no manual flagging needed.
alter table public.mens_products drop column if exists has_diamond;
alter table public.mens_products add column has_diamond boolean generated always as (name ilike '%diamond%') stored;

alter table public.mens_products enable row level security;

drop policy if exists "Active mens products are viewable by everyone" on public.mens_products;
create policy "Active mens products are viewable by everyone"
  on public.mens_products for select
  using (is_active = true);

-- =========================================================
-- mens_cart_items — same shape/RLS as cart_items, pointed at
-- mens_products instead of products.
-- =========================================================

create table if not exists public.mens_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.mens_products(id),
  color text,
  quantity integer not null default 1,
  selected_size text,
  selected_metal_type text,
  selected_diamond_quality text,
  unit_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mens_cart_items enable row level security;

drop policy if exists "Mens cart items are viewable by owner" on public.mens_cart_items;
create policy "Mens cart items are viewable by owner"
  on public.mens_cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Mens cart items are insertable by owner" on public.mens_cart_items;
create policy "Mens cart items are insertable by owner"
  on public.mens_cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Mens cart items are updatable by owner" on public.mens_cart_items;
create policy "Mens cart items are updatable by owner"
  on public.mens_cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Mens cart items are deletable by owner" on public.mens_cart_items;
create policy "Mens cart items are deletable by owner"
  on public.mens_cart_items for delete
  using (auth.uid() = user_id);

-- =========================================================
-- mens_reviews — mirrors how product.html already reads/writes the
-- (untracked) `reviews` table: product_id, user_id, reviewer_name,
-- rating, comment, created_at.
-- =========================================================

create table if not exists public.mens_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mens_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.mens_reviews enable row level security;

drop policy if exists "Mens reviews are viewable by everyone" on public.mens_reviews;
create policy "Mens reviews are viewable by everyone"
  on public.mens_reviews for select
  using (true);

drop policy if exists "Mens reviews are insertable by their author" on public.mens_reviews;
create policy "Mens reviews are insertable by their author"
  on public.mens_reviews for insert
  with check (auth.uid() = user_id);

-- =========================================================
-- mens_order_items — mirrors order_items, but order_id still points
-- at the SHARED public.orders table: one checkout/order can contain
-- both women's and men's items under a single order header row.
-- =========================================================

create table if not exists public.mens_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.mens_products(id),
  quantity integer not null check (quantity > 0),
  price numeric not null,
  color text,
  selected_size text,
  selected_metal_type text,
  selected_diamond_quality text,
  created_at timestamptz not null default now()
);

alter table public.mens_order_items enable row level security;

drop policy if exists "Mens order items are viewable by owner" on public.mens_order_items;
create policy "Mens order items are viewable by owner"
  on public.mens_order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = mens_order_items.order_id
        and o.user_id = auth.uid()
    )
  );
