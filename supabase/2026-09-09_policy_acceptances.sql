-- Added: 2026-09-09 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Records the "I have read and agree to the Privacy Policy and
-- Terms & Conditions" checkbox on product.html — one checkbox covers
-- both documents, so this is a single policy_accepted column (not
-- separate tnc/privacy booleans). Add to Cart / Add to Trial Cart are
-- blocked client-side until the box is checked (see product.html),
-- and this table is the server-side record of that.
--
-- Browsing/adding to cart stays open to guests (see js/cart.js's
-- localStorage guest cart), so most rows won't have a signed-in
-- user — user_id/name/email are nullable and left null for those,
-- same pattern as public.cookie_consents. name/email are read from
-- public.profiles at the moment of ticking (see product.html) — a
-- denormalized snapshot, not a live join, so the record stays
-- accurate even if the account's profile details change later.
--
-- product_id (references public.products) sits alongside product_slug
-- so the row survives a product being renamed/re-slugged.
--
-- Safe to re-run: if you already ran an earlier version of this
-- migration (separate tnc_accepted/privacy_policy_accepted columns,
-- or no product_id column yet), this brings it up to the current shape.
-- =========================================================

create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  policy_accepted boolean not null default true,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  ticked_at timestamptz not null default now()
);

alter table public.policy_acceptances add column if not exists product_id uuid references public.products(id) on delete set null;

-- Merge the old two-column shape into policy_accepted, if present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'policy_acceptances' and column_name = 'tnc_accepted'
  ) then
    alter table public.policy_acceptances add column if not exists policy_accepted boolean not null default true;
    update public.policy_acceptances
      set policy_accepted = coalesce(tnc_accepted, true) and coalesce(privacy_policy_accepted, true);
    alter table public.policy_acceptances drop column if exists tnc_accepted;
    alter table public.policy_acceptances drop column if exists privacy_policy_accepted;
  end if;
end $$;

create index if not exists policy_acceptances_user_id_idx on public.policy_acceptances(user_id);

alter table public.policy_acceptances enable row level security;

-- Anyone (including anonymous/guest shoppers) can log their own
-- acceptance; a logged-in shopper can only attach their own
-- auth.uid() as user_id.
drop policy if exists "Anyone can record their own policy acceptance" on public.policy_acceptances;
create policy "Anyone can record their own policy acceptance"
  on public.policy_acceptances for insert
  with check (user_id is null or user_id = auth.uid());

-- A logged-in shopper can see their own past acceptance rows;
-- anonymous rows (user_id null) aren't visible to anyone through the
-- anon key — read those from the Supabase dashboard directly if needed.
drop policy if exists "Policy acceptance viewable by owner" on public.policy_acceptances;
create policy "Policy acceptance viewable by owner"
  on public.policy_acceptances for select
  using (user_id is not null and user_id = auth.uid());
