-- =========================================================
-- CHANGE LOG — READ THIS FIRST
--
-- Every section below is tagged with the date it was added and a
-- status:
--   ✅ RUN            — you've confirmed this works in production
--   ⚠ NOT YET RUN     — run this now, nothing depends on it working yet
--   ❔ VERIFY          — probably run already, but not explicitly
--                        confirmed — double check before assuming so
--
-- Re-running the whole file is always safe (everything here is
-- idempotent — guarded with "if not exists", "if exists", or
-- NOT EXISTS checks) — but this log tells you what's actually NEW
-- since your last run, so you're not just guessing. Going forward,
-- every new section added to this file gets its own real date +
-- status the moment it's added.
-- =========================================================

-- =========================================================
-- OrenkaFine — Supabase schema for user accounts
-- Run this once in Supabase Dashboard → SQL Editor.
--
-- Auth still runs through Supabase Auth (auth.users) — passwords
-- are hashed and managed there, never touched directly by this app.
-- This "profiles" table is just a queryable mirror for display
-- fields: name, phone, email, address, created_at.
--
-- Matches the "profiles" table already in the dashboard:
--   id, full_name, phone, address_line1, address_line2,
--   city, state, pincode, created_at
-- ...plus an "email" column added below for convenience.
--
-- The signup form (auth-modal.js / signup.html) collects all of
-- these fields and passes them into auth.signUp()'s options.data.
-- This trigger reads them off the new auth.users row (email comes
-- straight from auth.users.email, not metadata) and writes the
-- matching profiles row automatically — it fires even when email
-- confirmation is required, so it works regardless of your
-- "Confirm email" setting.
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up, populated
-- from auth.users.email plus the metadata passed in
-- auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, address_line1, address_line2, city, state, pincode)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email,
    new.raw_user_meta_data ->> 'address_line1',
    new.raw_user_meta_data ->> 'address_line2',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'state',
    new.raw_user_meta_data ->> 'pincode'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time backfill: creates profile rows for any existing
-- auth.users that don't have one yet (e.g. people who signed up
-- before this trigger existed), and fills in "email" for any
-- existing profiles rows that predate that column.
insert into public.profiles (id, full_name, email)
select u.id, u.raw_user_meta_data ->> 'full_name', u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- The one-time "confirm every stuck account" fix that used to be
-- here has been removed. Now that OTP verification is live and the
-- welcome email fires on the email_confirmed_at transition (below),
-- re-running that update on every schema run would auto-confirm —
-- and welcome-email — every account still sitting unverified,
-- including brand new signups who just haven't entered their code
-- yet. That defeated the entire point of requiring OTP. If you ever
-- have genuinely stuck old accounts to unblock again, do it by hand,
-- one-off, in the SQL Editor — don't put it back in this file.

-- Added: 2026-07-23 — ✅ RUN (confirmed: OTP signup + welcome email tested end to end)
-- =========================================================
-- Welcome email trigger
-- Only run this AFTER you've deployed the welcome-email Edge
-- Function (supabase/functions/welcome-email/index.ts) and set its
-- RESEND_API_KEY / WELCOME_FROM_EMAIL / WEBHOOK_SECRET secrets.
--
-- This does the same job as a Database Webhook (Database →
-- Webhooks in the dashboard, if you have that page) but is wired
-- directly in SQL via pg_net, which every Supabase project already
-- has enabled — no hunting through dashboard menus required.
--
-- Fires on auth.users UPDATE, specifically the moment
-- email_confirmed_at flips from null to a real timestamp — i.e.
-- right after someone verifies their OTP code (or clicks a
-- confirmation link), not at raw signup. It used to fire on INSERT
-- into public.profiles, which happens immediately at signUp() time,
-- before verification — so the welcome email was going out before
-- the account was even usable. This is why welcome-email/index.ts
-- reads payload.record.email / .full_name: those are built
-- explicitly below to match, since auth.users itself only has email
-- directly (full_name lives in raw_user_meta_data).
-- =========================================================

create or replace function public.notify_welcome_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://xjepiecjsomrallliifj.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXBpZWNqc29tcmFsbGxpaWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODgyMDEsImV4cCI6MjA5OTY2NDIwMX0.cSYAd2dJcYOUvnGc66wjWtjVcww12p2rhHetZwzRoms',
      'x-webhook-secret', '34004203a12010dbcbd455ec00b87c9f846e3651527b79cf'
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'email', new.email,
        'full_name', new.raw_user_meta_data ->> 'full_name'
      )
    )
  );
  return new;
end;
$$;

-- Old (fired too early — at profile creation, before verification):
drop trigger if exists on_profile_created_welcome_email on public.profiles;

drop trigger if exists on_auth_user_confirmed_welcome_email on auth.users;
create trigger on_auth_user_confirmed_welcome_email
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.notify_welcome_email();

-- Added: 2026-07-23 — ✅ RUN (confirmed: cart merge on login working)
-- =========================================================
-- Row Level Security — cart_items and products
--
-- Both tables already exist in the dashboard (cart_items:
-- id, user_id, product_id, color, quantity, created_at,
-- updated_at / products: id, slug, name, price, is_active, ...)
-- but RLS was never turned on for them. Since the browser talks
-- to Supabase with the public anon key, the "eq(user_id, ...)"
-- filters in js/cart.js are only a UI convenience — anyone can
-- call the REST API directly with a different user_id and read
-- or write someone else's cart. Run this block once to close
-- that off.
-- =========================================================

alter table public.cart_items enable row level security;

drop policy if exists "Cart items are viewable by owner" on public.cart_items;
create policy "Cart items are viewable by owner"
  on public.cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Cart items are insertable by owner" on public.cart_items;
create policy "Cart items are insertable by owner"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Cart items are updatable by owner" on public.cart_items;
create policy "Cart items are updatable by owner"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Cart items are deletable by owner" on public.cart_items;
create policy "Cart items are deletable by owner"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- Products: readable by everyone (signed in or not) but only the
-- active ones — no insert/update/delete policy is added, so once
-- RLS is on, the anon/authenticated roles can't write to this
-- table at all. Manage the catalog from the Supabase dashboard
-- (or a service_role script), which bypasses RLS by design.
alter table public.products enable row level security;

drop policy if exists "Active products are viewable by everyone" on public.products;
create policy "Active products are viewable by everyone"
  on public.products for select
  using (is_active = true);

-- Added: 2026-07-23 — ⚠ NOT YET RUN — run this now (adds razorpay_order_id,
-- razorpay_payment_id, shipping_*, paid_at, and the order_items variant
-- columns the payment gateway needs; the table itself already exists
-- but was missing all of these)
-- =========================================================
-- Orders and order_items — schema + RLS scaffolding
--
-- checkout.html already calls two Edge Functions that don't exist
-- yet in this repo (create-razorpay-order / verify-razorpay-payment).
-- This block only creates the tables those functions will need and
-- locks them down; it does NOT build the functions themselves.
--
-- Deliberate design: authenticated/anon clients get SELECT only.
-- There is no insert/update policy for those roles, on purpose —
-- a browser with just the anon key must never be able to create an
-- order or set its own price. Once you build create-razorpay-order,
-- it has to run with the service_role key (which bypasses RLS) and
-- price every line item itself by reading public.products server
-- side — never by trusting the amount the client sends. That's
-- what keeps checkout tamper-proof; these policies just enforce
-- that there's no other way in.
--
-- Note: these tables already existed live with simpler columns
-- (total / price instead of subtotal / unit_price) before this
-- "create table if not exists" ever ran, so it was a silent no-op —
-- adjusted the column names here to match what's actually live, and
-- added the missing Razorpay/shipping columns via alter table below.
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | paid | failed | cancelled
  total numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price numeric not null, -- price captured at order time by the server, never the client
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists currency text not null default 'INR';
alter table public.orders add column if not exists razorpay_order_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists shipping_name text;
alter table public.orders add column if not exists shipping_phone text;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists shipping_city text;
alter table public.orders add column if not exists shipping_state text;
alter table public.orders add column if not exists shipping_pincode text;
alter table public.orders add column if not exists paid_at timestamptz;

alter table public.order_items add column if not exists color text;
alter table public.order_items add column if not exists selected_size text;
alter table public.order_items add column if not exists selected_metal_type text;
alter table public.order_items add column if not exists selected_diamond_quality text;

alter table public.orders enable row level security;

drop policy if exists "Orders are viewable by owner" on public.orders;
create policy "Orders are viewable by owner"
  on public.orders for select
  using (auth.uid() = user_id);

alter table public.order_items enable row level security;

drop policy if exists "Order items are viewable by owner" on public.order_items;
create policy "Order items are viewable by owner"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Added: 2026-07-23 — ✅ RUN (confirmed: gift-card.html tested working)
-- =========================================================
-- Digital Gift Card catalog seed
--
-- gift-card.html reads its five amount tiers straight from
-- public.products (category = 'Gift Card'), the same table and
-- RLS policy every other product uses — so the cart_items foreign
-- key + the "products are viewable by everyone" policy above just
-- work, no schema changes needed. Guarded with NOT EXISTS instead
-- of ON CONFLICT since slug has no known unique constraint; safe
-- to re-run.
--
-- Images point at the "Dgc" folder in the Images storage bucket
-- (see js/main.js toBucketUrl, which now maps "Dgc/..." the same
-- way it already maps "Products/..." and "Assets/...").
-- =========================================================

insert into public.products (slug, name, brand, category, price, image, description, is_active, stock)
select v.slug, v.name, v.brand, v.category, v.price, v.image, v.description, v.is_active, v.stock
from (values
  ('digital-gift-card-5000',  'Digital Gift Card - ₹5,000',  'OrenkaFine', 'Gift Card', 5000::numeric,  'Dgc/card1.png', 'A ₹5,000 OrenkaFine digital gift card, delivered straight to their inbox.',  true, 9999),
  ('digital-gift-card-10000', 'Digital Gift Card - ₹10,000', 'OrenkaFine', 'Gift Card', 10000::numeric, 'Dgc/card1.png', 'A ₹10,000 OrenkaFine digital gift card, delivered straight to their inbox.', true, 9999),
  ('digital-gift-card-15000', 'Digital Gift Card - ₹15,000', 'OrenkaFine', 'Gift Card', 15000::numeric, 'Dgc/card1.png', 'A ₹15,000 OrenkaFine digital gift card, delivered straight to their inbox.', true, 9999),
  ('digital-gift-card-20000', 'Digital Gift Card - ₹20,000', 'OrenkaFine', 'Gift Card', 20000::numeric, 'Dgc/card1.png', 'A ₹20,000 OrenkaFine digital gift card, delivered straight to their inbox.', true, 9999),
  ('digital-gift-card-25000', 'Digital Gift Card - ₹25,000', 'OrenkaFine', 'Gift Card', 25000::numeric, 'Dgc/card1.png', 'A ₹25,000 OrenkaFine digital gift card, delivered straight to their inbox.', true, 9999)
) as v(slug, name, brand, category, price, image, description, is_active, stock)
where not exists (select 1 from public.products p where p.slug = v.slug);

-- Added: 2026-07-23 — ✅ RUN (confirmed: karat/diamond/size pricing tested working)
-- =========================================================
-- Gold-rate metal pricing + diamond flag
--
-- product.html was replaced with a version (built elsewhere, not
-- through this SQL file) that computes Metal Type pricing live from
-- gold_weight_grams x a market rate in gold_rates, instead of
-- needing a separate product row per karat. It also reads
-- has_diamond to decide whether to show the Diamond Type & Quality
-- picker at all. None of these three things existed in any SQL
-- file in this repo — they were apparently added by hand straight
-- in the Supabase dashboard in that other session and never saved
-- anywhere. Adding them here now so they're actually tracked.
--
-- All guarded / idempotent, safe to re-run.
-- =========================================================

-- has_diamond is derived automatically from the product name — any
-- product whose name contains "diamond" (case-insensitive) counts
-- as a diamond product. No manual flagging or seed data needed; it
-- stays correct for every existing and future row, including
-- whatever scrape-foro.js imports.
alter table public.products drop column if exists has_diamond;
alter table public.products add column has_diamond boolean generated always as (name ilike '%diamond%') stored;

alter table public.products add column if not exists gold_weight_grams numeric;

-- Stored as ₹ per 10 grams (rate_24kt_per_10g), matching how Indian
-- gold rates are always quoted — no manual /10 conversion needed
-- before entering a value here. calculate_product_price() and the
-- product.html/product-men.html legacy pricing path divide by 10
-- internally wherever a per-gram figure is actually needed.
create table if not exists public.gold_rates (
  id int primary key,
  rate_24kt_per_10g numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.gold_rates enable row level security;

drop policy if exists "Gold rates are viewable by everyone" on public.gold_rates;
create policy "Gold rates are viewable by everyone"
  on public.gold_rates for select
  using (true);

-- Real 24kt gold rate as of today (₹1,46,560 / 10g, Delhi retail,
-- per public gold-rate sites — this is a manually looked-up
-- snapshot, not a live feed). Update this by hand periodically for
-- now; supabase/functions/update-gold-rate/index.ts has the code
-- to fetch this live and update the row automatically, but it is
-- NOT deployed or scheduled yet — see that file's header comment
-- before activating it.
-- Uses "do update" (not "do nothing") so re-running this file
-- always refreshes the row to whatever value is here.
insert into public.gold_rates (id, rate_24kt_per_10g)
values (1, 146560)
on conflict (id) do update set
  rate_24kt_per_10g = excluded.rate_24kt_per_10g,
  updated_at = now();

-- Added: 2026-07-23 — ❔ VERIFY (likely run alongside the sections above,
-- but not explicitly confirmed — check collections.html's Material
-- filter actually shows Baguette/Diamond/Emerald/etc. with real counts)
-- =========================================================
-- Material auto-categorization
--
-- public.products.material was already in use for gold karat/purity
-- text (e.g. "18 karat gold" — read by product.html's Material meta
-- row and js/main.js's card label). Renaming that existing column to
-- gold_type so it keeps holding exactly what it always held, then
-- creating a fresh material column for the new fixed-list category
-- (Baguette, Diamond, Emerald, Emerald Gold, Evil Eye Gold, Gold,
-- Marquise, Ruby Gemstones, Ruby Gold) collections.html's Material
-- filter now uses. The rename is guarded so this file stays safe to
-- re-run — it only fires once, the first time gold_type doesn't
-- exist yet but material does.
--
-- product.html, js/products-db.js, js/main.js, and js/products.js
-- were all updated to read gold_type where they used to read
-- material for karat text, and to use the new material column only
-- for the category filter.
-- =========================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'material'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'gold_type'
  ) then
    alter table public.products rename column material to gold_type;
  end if;
end $$;

alter table public.products add column if not exists gold_type text;
alter table public.products add column if not exists material text;

-- This fills in the new material column by scanning each product's
-- name + description for those words, case-insensitive.
--
-- Order matters: compound phrases (e.g. "Emerald Gold") are checked
-- before the single words they contain ("Emerald", "Gold"), so a
-- product named "Emerald Gold Ring" gets categorized as "Emerald
-- Gold" and not just "Gold". Same reasoning for "Evil Eye Gold",
-- "Ruby Gemstones", and "Ruby Gold" ahead of plain "Gold".
--
-- Only overwrites when a keyword actually matches (the "else
-- material" branch leaves anything else untouched) — safe to
-- re-run any time after the scraper updates names/descriptions.

update public.products
set material = case
  when (name || ' ' || coalesce(description, '')) ilike '%emerald gold%'   then 'Emerald Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%evil eye gold%'  then 'Evil Eye Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%ruby gemstones%' then 'Ruby Gemstones'
  when (name || ' ' || coalesce(description, '')) ilike '%ruby gold%'      then 'Ruby Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%baguette%'       then 'Baguette'
  when (name || ' ' || coalesce(description, '')) ilike '%marquise%'       then 'Marquise'
  when (name || ' ' || coalesce(description, '')) ilike '%diamond%'        then 'Diamond'
  when (name || ' ' || coalesce(description, '')) ilike '%emerald%'        then 'Emerald'
  when (name || ' ' || coalesce(description, '')) ilike '%gold%'           then 'Gold'
  else material
end;

-- Added: 2026-07-23 — ✅ RUN (confirmed: cart shows size/metal/diamond
-- details correctly, separate lines for different variants)
-- =========================================================
-- cart_items — save the selected variant, not just color
--
-- product.html now lets someone pick Color, Size, Metal Type, and
-- Diamond Quality independently, and computes a live price from
-- that combination (karat formula x diamond multiplier x size
-- adjustment). cart_items previously only stored color + quantity,
-- reading price live from products.price — so for signed-in users,
-- the size/metal/diamond choice and the actual computed price were
-- silently lost the moment the item was saved to the account cart
-- (guest/localStorage carts didn't have this problem, since they
-- store the whole item object client-side).
--
-- selected_size / selected_metal_type / selected_diamond_quality
-- join color as part of each line's identity (js/cart.js now
-- matches on all of them together), so two different variant picks
-- of the same product become two separate cart lines instead of
-- merging into one. unit_price stores the exact price shown on
-- product.html at add-to-cart time; js/cart.js prefers it over the
-- live products.price when present.
-- =========================================================

alter table public.cart_items add column if not exists selected_size text;
alter table public.cart_items add column if not exists selected_metal_type text;
alter table public.cart_items add column if not exists selected_diamond_quality text;
alter table public.cart_items add column if not exists unit_price numeric;

-- Added: 2026-07-27 — ⚠ NOT YET RUN — run this now (scrape-gabriel-mens.js,
-- kept outside this repo on the Desktop, inserts rows with a `gender`
-- column that doesn't exist in the live table yet — that upsert will
-- fail with an "unknown column" error until this runs)
-- =========================================================
-- gender column for men's catalog import
--
-- Nothing in this repo filters or displays by gender yet (the "Men's
-- Jewellery" footer link just points at collections.html with no
-- filter) — this only adds the column so the scraper's upsert has
-- somewhere to write "Men". Wiring an actual Men/Women filter into
-- collections.html is separate, not-yet-done frontend work.
--
-- After adding the column, run supabase/seed_mens_products.sql once
-- to backfill colors, gold weight, material, and the price-breakup
-- columns for whatever the scraper just inserted — those all default
-- to null/empty on a fresh insert, same gap the products table had
-- before seed_product_colors.sql / seed_product_specs.sql ran.
-- =========================================================

alter table public.products add column if not exists gender text;

-- Added: 2026-08-26 — clear out discounted (old_price) values
-- =========================================================
-- Removes every existing old_price value on both catalogs. These were
-- seeded/imported data, not confirmed real discounts — the storefront
-- (js/products-db.js mapDbProductToCard) auto-derives the "old price"
-- strike-through and discount % straight from this column whenever
-- it's non-null, so clearing it here removes every discount badge
-- site-wide without any frontend changes. The old_price column itself
-- is kept (not dropped) — set it manually, per product, only for
-- items that actually have a real discount going forward.
-- =========================================================
update public.products set old_price = null where old_price is not null;
update public.mens_products set old_price = null where old_price is not null;

-- Added: 2026-08-26 — drop unused/dead columns from public.products
-- =========================================================
-- Every column below was checked against the live frontend (js/*.js,
-- every product/collections/checkout .html) and none of them are read
-- anywhere:
--   image_url, secondary_image_url  — dead duplicates; the site only
--     ever reads `image` / `secondary_image` (see
--     js/products-db.js mapDbProductToCard).
--   house       — unrelated to `state.house` in collections.html,
--                  which is actually derived from `brand`, not this
--                  column.
--   subcategory — never read; `category` is the only taxonomy field
--                  the frontend filters/displays by.
--   currency    — never read from a product row; the only `currency`
--                  in the codebase comes from the Razorpay order
--                  response in checkout.html, unrelated to this column.
--   source_url  — scraper provenance only, not displayed or queried
--                  anywhere in the storefront.
--   updated_at  — unused on products (the `updated_at` usages in
--                  js/cart.js are on the unrelated cart_items table).
--   woo_id      — dead; only `woo_parent_id` is actually used (product
--                  variant lookups in product.html/product-men.html).
--   sku         — never read anywhere.
--   variant_diamond_carat — dead duplicate of `diamond_weight_ct`,
--                  which is the field product.html/product-men.html
--                  actually display and price against.
-- mens_products never had most of these (see supabase/mens_schema.sql)
-- and isn't touched here — only public.products needed the cleanup.
-- =========================================================
alter table public.products drop column if exists image_url;
alter table public.products drop column if exists secondary_image_url;
alter table public.products drop column if exists house;
alter table public.products drop column if exists subcategory;
alter table public.products drop column if exists currency;
alter table public.products drop column if exists source_url;
alter table public.products drop column if exists updated_at;
alter table public.products drop column if exists woo_id;
alter table public.products drop column if exists sku;
alter table public.products drop column if exists variant_diamond_carat;

-- Added: 2026-08-26 — ⚠ NOT YET RUN — run this now
-- =========================================================
-- Bottom-up jewelry pricing: diamond_rates, pricing_settings,
-- product_variants, calculate_product_price()
--
-- Real formula: GoldCost + DiamondCost + MakingCharge = Subtotal,
-- then GST = 3% x Subtotal, FinalPrice = Subtotal + GST.
--
-- GoldCost uses hallmark fineness (9K=.375, 14K=.585, 18K=.750) x
-- one 24K rate already in gold_rates. DiamondCost needs a rate per
-- carat by quality (diamond_rates) and a per-product diamond
-- weight/quality — but that can vary per product, and a single
-- product can offer more than one diamond quality/carat option, so
-- product_variants holds one row per (product, diamond quality)
-- combination instead of a single diamond_weight_ct/
-- variant_diamond_quality pair on products.
--
-- calculate_product_price() is the ONE place this formula lives
-- (instead of duplicated across product.html, product-men.html,
-- cart JS, and card grids). It returns is_calculated = false
-- (all amounts null) whenever gold_weight_grams, gold_rates, or
-- pricing_settings aren't available for a product — the frontend's
-- existing legacy pricing path (computeAdjustedPrice /
-- diamondMultiplier in product.html) is untouched and keeps
-- handling that case exactly as it does today. GST is deliberately
-- NOT added to that legacy path — historical products.price values
-- may already include GST, so stacking another 3% on top would
-- double-charge.
--
-- Scope: public.products only (the Foro catalog). mens_products is
-- deferred — it has its own separate schema and no row-level
-- variant structure to hang product_variants off yet.
-- =========================================================

-- Indian gold rates are always quoted "₹X per 10 grams", not per
-- gram — rate_24kt_per_gram forced a manual /10 conversion before
-- every insert/update. Renaming to rate_24kt_per_10g so the value
-- can be entered exactly as quoted; calculate_product_price() and
-- the product.html/product-men.html legacy pricing path both divide
-- by 10 internally now. Multiplying the existing value by 10 here
-- converts the current per-gram seed to the equivalent per-10g
-- value, so the real rate stays the same — only its unit changes.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gold_rates' and column_name = 'rate_24kt_per_gram'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gold_rates' and column_name = 'rate_24kt_per_10g'
  ) then
    alter table public.gold_rates rename column rate_24kt_per_gram to rate_24kt_per_10g;
    update public.gold_rates set rate_24kt_per_10g = rate_24kt_per_10g * 10;
  end if;
end $$;

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

-- One row per (product, diamond quality) option. diamond_count is
-- display-only (number of stones), not used in the price formula.
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

-- Backfill: give every existing product that already has
-- diamond_weight_ct/variant_diamond_quality set a default
-- product_variants row, so nothing currently working breaks.
insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, is_default)
select id, variant_diamond_quality, diamond_weight_ct, true
from public.products
where diamond_weight_ct is not null
  and variant_diamond_quality is not null
  and not exists (
    select 1 from public.product_variants pv where pv.product_id = products.id
  );

-- Dropped and recreated (rather than "create or replace") because
-- this adds a new p_size_id parameter — Postgres treats a changed
-- argument list as a different function, so replacing in place
-- would leave the old 3-arg version lying around as a separate
-- overload instead of actually being replaced.
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
  if p_size_id is not null then
    select ps.gold_weight_grams into v_weight
    from public.product_sizes ps
    where ps.id = p_size_id and ps.product_id = p_product_id;
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

-- Added: 2026-08-26 — ⚠ NOT YET RUN — run this now
-- =========================================================
-- Launch specs for the 4 named products: gold weight, colors, and
-- both diamond-quality variants (GH-VS-SI / F-G-VVS-VS), matching:
--
--   Product                              Gold   Count  Total ct
--   Diamond Shree Gold Bracelet          2.00g    5     0.05 ct
--   Diamond Damru Gold Stud Earrings     1.00g    2     0.02 ct
--   Diamond Trishul Gold Stud Earrings   1.00g    1     0.04 ct
--   Diamond Om Gold Stud Earrings        1.00g    1     0.03 ct
--
-- Both quality options for a given product share the same total
-- diamond weight/count (per the spec table above) — only the ₹/ct
-- rate differs between them. Matched by exact product name; adjust
-- the names below if they don't match what's actually in the DB.
-- =========================================================

-- Re-declared here (idempotent) in case this section gets run on
-- its own before the product_variants table's own "create unique
-- index if not exists" line above ever ran — the upsert below
-- needs it to exist no matter which parts of this file already ran.
create unique index if not exists product_variants_product_quality_uidx on public.product_variants(product_id, diamond_quality);

update public.products set
  gold_weight_grams = 2.00,
  colors = array['Rose Gold','Yellow Gold','White Gold'],
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.05
where name = 'Diamond Shree Gold Bracelet';

update public.products set
  gold_weight_grams = 1.00,
  colors = array['Rose Gold','Yellow Gold','White Gold'],
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.02
where name = 'Diamond Damru Gold Stud Earrings';

update public.products set
  gold_weight_grams = 1.00,
  colors = array['Rose Gold','Yellow Gold','White Gold'],
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.04
where name = 'Diamond Trishul Gold Stud Earrings';

update public.products set
  gold_weight_grams = 1.00,
  colors = array['Rose Gold','Yellow Gold','White Gold'],
  variant_diamond_quality = 'GH-VS-SI',
  diamond_weight_ct = 0.03
where name = 'Diamond Om Gold Stud Earrings';

insert into public.product_variants (product_id, diamond_quality, diamond_weight_ct, diamond_count, is_default)
select p.id, v.quality, v.ct, v.diamond_count, (v.quality = 'GH-VS-SI')
from public.products p
join (
  values
    ('Diamond Shree Gold Bracelet', 'GH-VS-SI', 0.05::numeric, 5),
    ('Diamond Shree Gold Bracelet', 'F-G-VVS-VS', 0.05::numeric, 5),
    ('Diamond Damru Gold Stud Earrings', 'GH-VS-SI', 0.02::numeric, 2),
    ('Diamond Damru Gold Stud Earrings', 'F-G-VVS-VS', 0.02::numeric, 2),
    ('Diamond Trishul Gold Stud Earrings', 'GH-VS-SI', 0.04::numeric, 1),
    ('Diamond Trishul Gold Stud Earrings', 'F-G-VVS-VS', 0.04::numeric, 1),
    ('Diamond Om Gold Stud Earrings', 'GH-VS-SI', 0.03::numeric, 1),
    ('Diamond Om Gold Stud Earrings', 'F-G-VVS-VS', 0.03::numeric, 1)
) as v(product_name, quality, ct, diamond_count)
  on v.product_name = p.name
on conflict (product_id, diamond_quality) do update set
  diamond_weight_ct = excluded.diamond_weight_ct,
  diamond_count = excluded.diamond_count,
  is_default = excluded.is_default;

-- Added: 2026-08-26 — ⚠ NOT YET RUN — run this now
-- =========================================================
-- product_sizes — RUN THIS: table + Diamond Shree Gold Bracelet's
-- real per-size gold weight, sizes 6 / 6.5 / 7, +5% weight per 0.5
-- size step off the 2.00g base at size 6 (matches
-- products.gold_weight_grams set above):
--   6    -> 2.00g  (base)
--   6.5  -> 2.10g  (+5%)
--   7    -> 2.20g  (+10%, i.e. +5% again over 6.5)
--
-- One row per (product, size) — a real gold weight for that exact
-- size, instead of the generic ±2%-per-step estimate product.html
-- falls back to when no real per-size data exists.
-- =========================================================

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  gold_weight_grams numeric not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_sizes_product_id_idx on public.product_sizes(product_id);
create unique index if not exists product_sizes_product_size_uidx on public.product_sizes(product_id, size);

alter table public.product_sizes enable row level security;

drop policy if exists "Product sizes are viewable by everyone" on public.product_sizes;
create policy "Product sizes are viewable by everyone"
  on public.product_sizes for select
  using (true);

insert into public.product_sizes (product_id, size, gold_weight_grams, is_default)
select p.id, v.size, v.weight, (v.size = '6')
from public.products p
join (
  values
    ('6', 2.00::numeric),
    ('6.5', 2.10::numeric),
    ('7', 2.20::numeric)
) as v(size, weight)
  on true
where p.name = 'Diamond Shree Gold Bracelet'
on conflict (product_id, size) do update set
  gold_weight_grams = excluded.gold_weight_grams,
  is_default = excluded.is_default;

-- Added: 2026-08-26 — ⚠ NOT YET RUN — run this now
-- =========================================================
-- Storefront-wide visibility: only these 4 products (plus Digital
-- Gift Cards) should show up anywhere on the site.
--
-- Deliberately done via is_active = false rather than deleting
-- rows — the existing "Active products are viewable by everyone"
-- RLS policy on public.products (added 2026-07-23, see above)
-- already restricts every page's product query to is_active = true,
-- so this alone hides everything else site-wide with zero frontend
-- changes needed. It's also fully reversible: nothing is deleted,
-- so re-activating any of these later is just flipping is_active
-- back to true for that row.
--
-- Scope: public.products only. mens_products (product-men.html /
-- mens-collection.html) is untouched — its catalog keeps showing
-- whatever's currently active there. Gift Card rows (category =
-- 'Gift Card') are explicitly excluded from deactivation so
-- gift-card.html keeps working.
-- =========================================================

update public.products
set is_active = false
where (category is distinct from 'Gift Card')
  and name not in (
    'Diamond Shree Gold Bracelet',
    'Diamond Damru Gold Stud Earrings',
    'Diamond Trishul Gold Stud Earrings',
    'Diamond Om Gold Stud Earrings'
  );

update public.products
set is_active = true
where name in (
    'Diamond Shree Gold Bracelet',
    'Diamond Damru Gold Stud Earrings',
    'Diamond Trishul Gold Stud Earrings',
    'Diamond Om Gold Stud Earrings'
  );

-- Added: 2026-08-26 — ⚠ NOT YET RUN — run this now
-- =========================================================
-- Snapshot the real bottom-up price into products.price for these 4
-- products, using 18kt + each product's default diamond variant
-- (is_default = true, i.e. GH-VS-SI) as the baseline.
--
-- Card/grid views (collections.html, index.html, via
-- js/products-db.js mapDbProductToCard) read products.price
-- directly — they don't run the live gold+diamond+making+GST
-- formula the way product.html does, so without this the cards
-- would still show the old scraped price while the product page
-- shows the real one. This is a snapshot, not a live link: re-run
-- this block whenever gold_rates/diamond_rates/pricing_settings
-- change, to keep the cards in sync. Only updates when
-- calculate_product_price() actually returns a value — never
-- overwrites price with null if data's still missing for a product.
-- =========================================================

update public.products p
set price = sub.final_price
from (
  select pv.product_id, c.final_price
  from public.product_variants pv,
       lateral calculate_product_price(pv.product_id, '18kt', pv.id) c
  where pv.is_default = true
    and c.is_calculated = true
) sub
where sub.product_id = p.id
  and p.name in (
    'Diamond Shree Gold Bracelet',
    'Diamond Damru Gold Stud Earrings',
    'Diamond Trishul Gold Stud Earrings',
    'Diamond Om Gold Stud Earrings'
  );
