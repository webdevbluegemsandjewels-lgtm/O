-- Added: 2026-09-10 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Adds a user_name column to cart_items and mens_cart_items (the only
-- two tables with a user_id column that had no accompanying name
-- field — cookie_consents.name, policy_acceptances.name,
-- reviews.reviewer_name and orders.shipping_name already cover this
-- elsewhere).
--
-- user_name is auto-filled from public.profiles.full_name:
--   - this script backfills every existing row once, and
--   - a BEFORE INSERT trigger fills it for every row added from now
--     on, so js/cart.js doesn't need to change at all.
-- Safe to re-run.
-- =========================================================

alter table public.cart_items add column if not exists user_name text;
alter table public.mens_cart_items add column if not exists user_name text;

-- One-time backfill for rows that already exist.
update public.cart_items ci
set user_name = p.full_name
from public.profiles p
where p.id = ci.user_id
  and (ci.user_name is distinct from p.full_name);

update public.mens_cart_items ci
set user_name = p.full_name
from public.profiles p
where p.id = ci.user_id
  and (ci.user_name is distinct from p.full_name);

-- Keep it filled automatically for every future insert.
create or replace function public.set_cart_item_user_name()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.user_name is null then
    select full_name into new.user_name from public.profiles where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_cart_item_set_user_name on public.cart_items;
create trigger on_cart_item_set_user_name
  before insert on public.cart_items
  for each row execute function public.set_cart_item_user_name();

drop trigger if exists on_mens_cart_item_set_user_name on public.mens_cart_items;
create trigger on_mens_cart_item_set_user_name
  before insert on public.mens_cart_items
  for each row execute function public.set_cart_item_user_name();
