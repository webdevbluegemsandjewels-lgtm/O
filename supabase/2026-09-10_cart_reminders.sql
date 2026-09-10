-- Added: 2026-09-10 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Abandoned-cart EMAIL reminders. When a signed-in shopper adds
-- something to their cart (public.cart_items — guests are
-- localStorage-only, see js/cart.js, and can't be reached afterwards),
-- a row is queued here with scheduled_at = 3 days later. A separate
-- Edge Function (supabase/functions/send-cart-reminder), run hourly
-- via pg_cron (see the bottom of this file), sends the actual email
-- once scheduled_at has passed and flips status to 'sent'.
--
-- The "status" column doubles as both when a reminder is due and
-- whether it has gone out yet:
--   'pending'   — not sent yet; scheduled_at says when it will be
--   'sent'      — the email went out; sent_at says when
--   'cancelled' — the cart line was removed/checked out before the
--                 reminder was due, so nothing will be sent
--   'failed'    — the send attempt errored (see supabase function logs)
--
-- CHANGE THE DELAY: edit the `interval '3 days'` in
-- queue_cart_reminder() below (currently fires 3 days after the item
-- was added to the cart).
--
-- Safe to re-run: uses add/drop column if exists so it also upgrades
-- an earlier version of this table (which had channel/converted/
-- WhatsApp-oriented columns this version removes, being email-only).
-- =========================================================

create table if not exists public.cart_reminders (
  id uuid primary key default gen_random_uuid(),

  -- Who to email — snapshotted from auth.users/public.profiles at the
  -- moment the reminder was queued, so it still reads correctly even
  -- if the shopper later changes their name/email.
  user_id uuid references auth.users(id) on delete cascade,
  user_name text,
  user_email text,

  -- What's in their cart — snapshotted from cart_items/products so
  -- the email still shows correctly even if the cart line or product
  -- changes later.
  cart_item_id uuid references public.cart_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  product_image text,
  color text,
  selected_size text,
  selected_metal_type text,
  selected_diamond_quality text,
  quantity int not null default 1,
  unit_price numeric,

  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled', 'failed')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade an earlier version of this table that had WhatsApp/SMS
-- columns and a different status set.
alter table public.cart_reminders drop column if exists channel;
alter table public.cart_reminders drop column if exists user_phone;
alter table public.cart_reminders drop column if exists message_text;
alter table public.cart_reminders drop column if exists cart_last_active_at;
alter table public.cart_reminders add column if not exists scheduled_at timestamptz not null default (now() + interval '3 days');
alter table public.cart_reminders alter column scheduled_at drop default;

create index if not exists cart_reminders_user_id_idx on public.cart_reminders(user_id);
create index if not exists cart_reminders_status_idx on public.cart_reminders(status);
create index if not exists cart_reminders_pending_due_idx on public.cart_reminders(scheduled_at) where status = 'pending';

alter table public.cart_reminders enable row level security;

-- Nothing here is written by the browser — rows are only ever
-- written by triggers below (security definer) or the service-role
-- Edge Function. A logged-in shopper can read their own reminder
-- history but can't see or write anyone else's.
drop policy if exists "Cart reminders viewable by owner" on public.cart_reminders;
create policy "Cart reminders viewable by owner"
  on public.cart_reminders for select
  using (user_id is not null and user_id = auth.uid());

-- =========================================================
-- Queue a reminder the moment something is added to cart_items.
-- =========================================================
create or replace function public.queue_cart_reminder()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_email text;
  v_product_name text;
  v_product_image text;
begin
  select full_name, email into v_name, v_email from public.profiles where id = new.user_id;
  select name, image into v_product_name, v_product_image from public.products where id = new.product_id;

  -- Nothing to email without an address.
  if v_email is null then
    return new;
  end if;

  insert into public.cart_reminders (
    user_id, user_name, user_email, cart_item_id, product_id, product_name, product_image,
    color, selected_size, selected_metal_type, selected_diamond_quality, quantity, unit_price,
    status, scheduled_at
  )
  values (
    new.user_id, v_name, v_email, new.id, new.product_id, v_product_name, v_product_image,
    new.color, new.selected_size, new.selected_metal_type, new.selected_diamond_quality,
    new.quantity, new.unit_price,
    'pending', now() + interval '3 days'
  );
  return new;
end;
$$;

drop trigger if exists on_cart_item_added_queue_reminder on public.cart_items;
create trigger on_cart_item_added_queue_reminder
  after insert on public.cart_items
  for each row execute function public.queue_cart_reminder();

-- Keep quantity/price on a still-pending reminder in sync if the
-- shopper changes their cart before the reminder fires.
create or replace function public.refresh_cart_reminder()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.cart_reminders
    set quantity = new.quantity, unit_price = new.unit_price
    where cart_item_id = new.id and status = 'pending';
  return new;
end;
$$;

drop trigger if exists on_cart_item_updated_refresh_reminder on public.cart_items;
create trigger on_cart_item_updated_refresh_reminder
  after update on public.cart_items
  for each row execute function public.refresh_cart_reminder();

-- Cancel a pending reminder if the cart line is removed before it
-- fires — whether because the shopper checked out or just removed
-- the item, either way they're no longer "abandoning" it.
create or replace function public.cancel_cart_reminder()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.cart_reminders
    set status = 'cancelled'
    where cart_item_id = old.id and status = 'pending';
  return old;
end;
$$;

drop trigger if exists on_cart_item_removed_cancel_reminder on public.cart_items;
create trigger on_cart_item_removed_cancel_reminder
  after delete on public.cart_items
  for each row execute function public.cancel_cart_reminder();

-- =========================================================
-- Hourly schedule that calls the send-cart-reminder Edge Function,
-- which actually emails everything due (status='pending' and
-- scheduled_at <= now()) and flips it to 'sent'.
--
-- Requires the pg_cron extension (enable it once under Database →
-- Extensions in the dashboard if this errors) and the
-- send-cart-reminder function to be deployed first
-- (supabase functions deploy send-cart-reminder), with its
-- WEBHOOK_SECRET matching the one below.
-- =========================================================
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-cart-reminder-hourly') then
    perform cron.unschedule('send-cart-reminder-hourly');
  end if;
end $$;

select cron.schedule(
  'send-cart-reminder-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://xjepiecjsomrallliifj.supabase.co/functions/v1/send-cart-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXBpZWNqc29tcmFsbGxpaWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODgyMDEsImV4cCI6MjA5OTY2NDIwMX0.cSYAd2dJcYOUvnGc66wjWtjVcww12p2rhHetZwzRoms',
      'x-webhook-secret', '34004203a12010dbcbd455ec00b87c9f846e3651527b79cf'
    ),
    body := '{}'::jsonb
  );
  $$
);
