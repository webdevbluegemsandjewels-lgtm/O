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

-- One-time fix: accounts created while "Confirm email" was still on
-- are stuck as unconfirmed forever — turning that setting off only
-- affects signups going forward, it does NOT retroactively confirm
-- existing accounts. Run this once to unblock them:
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

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
-- BEFORE RUNNING: replace REPLACE_WITH_YOUR_WEBHOOK_SECRET below
-- with the exact same random string you set as WEBHOOK_SECRET on
-- the Edge Function.
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
      'x-webhook-secret', 'REPLACE_WITH_YOUR_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists on_profile_created_welcome_email on public.profiles;
create trigger on_profile_created_welcome_email
  after insert on public.profiles
  for each row execute function public.notify_welcome_email();
