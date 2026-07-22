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
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | paid | failed | cancelled
  subtotal numeric not null,
  currency text not null default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_state text,
  shipping_pincode text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  color text,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null, -- price captured at order time by the server, never the client
  created_at timestamptz not null default now()
);

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

create table if not exists public.gold_rates (
  id int primary key,
  rate_24kt_per_gram numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.gold_rates enable row level security;

drop policy if exists "Gold rates are viewable by everyone" on public.gold_rates;
create policy "Gold rates are viewable by everyone"
  on public.gold_rates for select
  using (true);

-- Real 24kt gold rate as of today (₹14,656/gram, Delhi retail,
-- per public gold-rate sites — this is a manually looked-up
-- snapshot, not a live feed). Update this by hand periodically for
-- now; supabase/functions/update-gold-rate/index.ts has the code
-- to fetch this live and update the row automatically, but it is
-- NOT deployed or scheduled yet — see that file's header comment
-- before activating it.
-- Uses "do update" (not "do nothing") so re-running this file
-- always refreshes the row to whatever value is here.
insert into public.gold_rates (id, rate_24kt_per_gram)
values (1, 14656)
on conflict (id) do update set
  rate_24kt_per_gram = excluded.rate_24kt_per_gram,
  updated_at = now();

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
