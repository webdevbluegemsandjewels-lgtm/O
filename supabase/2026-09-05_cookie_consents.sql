-- Added: 2026-09-05 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Tracks whether each visitor accepted or rejected the cookie
-- banner (js/cookie-consent.js, included on every page). Browsing
-- stays open to everyone on this site (see js/auth.js), so most
-- visitors clicking Accept/Reject won't be logged in — user_id and
-- name are both nullable and simply left null for those anonymous
-- rows. `name` is a denormalized snapshot of the visitor's name at
-- the moment they responded (from auth user_metadata/email), not a
-- live join to profiles, so the record still reads correctly even if
-- their profile name changes later.
-- =========================================================

create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  accepted boolean not null,
  responded_at timestamptz not null default now()
);

create index if not exists cookie_consents_user_id_idx on public.cookie_consents(user_id);

alter table public.cookie_consents enable row level security;

-- Anyone (including anonymous visitors) can log their own choice;
-- a logged-in visitor can only attach their own auth.uid() as user_id.
drop policy if exists "Anyone can record their own cookie consent" on public.cookie_consents;
create policy "Anyone can record their own cookie consent"
  on public.cookie_consents for insert
  with check (user_id is null or user_id = auth.uid());

-- A logged-in visitor can see their own past consent rows; anonymous
-- rows (user_id null) aren't visible to anyone through the anon key —
-- read those from the Supabase dashboard directly if needed.
drop policy if exists "Cookie consent viewable by owner" on public.cookie_consents;
create policy "Cookie consent viewable by owner"
  on public.cookie_consents for select
  using (user_id is not null and user_id = auth.uid());
