-- Added: 2026-09-11 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Turns the product "heart" icon (js/main.js productCardHTML, and
-- product.html's own #productWishBtn) into a real like/wishlist
-- system.
--
-- public.wishlist — one row per (user, product) they've liked.
--   Toggling the heart inserts a row (like) or deletes it (unlike) —
--   see js/likes.js. user_name/product_name are denormalized
--   snapshots (same convention as cart_reminders/policy_acceptances)
--   so this table still reads correctly even if a profile name or
--   product name changes later.
--
-- public.product_likes — one row per product with a running
--   like_count, kept in sync automatically by triggers below whenever
--   a wishlist row is added/removed. This is what's actually queried
--   to show "X likes" on a product — reading COUNT(*) from wishlist
--   on every card render would be far more expensive at scale.
--
-- Safe to re-run.
-- =========================================================

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text,
  liked_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_user_id_idx on public.wishlist(user_id);
create index if not exists wishlist_product_id_idx on public.wishlist(product_id);

alter table public.wishlist enable row level security;

drop policy if exists "Wishlist rows are viewable by owner" on public.wishlist;
create policy "Wishlist rows are viewable by owner"
  on public.wishlist for select
  using (auth.uid() = user_id);

drop policy if exists "Wishlist rows are insertable by owner" on public.wishlist;
create policy "Wishlist rows are insertable by owner"
  on public.wishlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "Wishlist rows are deletable by owner" on public.wishlist;
create policy "Wishlist rows are deletable by owner"
  on public.wishlist for delete
  using (auth.uid() = user_id);

create table if not exists public.product_likes (
  product_id uuid primary key references public.products(id) on delete cascade,
  product_name text,
  like_count integer not null default 0
);

alter table public.product_likes enable row level security;

-- Like counts are public info shown on every product card, including
-- to guests who aren't logged in.
drop policy if exists "Product like counts are viewable by anyone" on public.product_likes;
create policy "Product like counts are viewable by anyone"
  on public.product_likes for select
  using (true);

-- No insert/update/delete policy for product_likes: it's only ever
-- written by the trigger functions below (security definer), never
-- directly by a client.

create or replace function public.apply_wishlist_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.product_likes (product_id, product_name, like_count)
  values (new.product_id, new.product_name, 1)
  on conflict (product_id) do update
    set like_count = public.product_likes.like_count + 1,
        product_name = coalesce(excluded.product_name, public.product_likes.product_name);
  return new;
end;
$$;

drop trigger if exists on_wishlist_insert_bump_like_count on public.wishlist;
create trigger on_wishlist_insert_bump_like_count
  after insert on public.wishlist
  for each row execute function public.apply_wishlist_like();

create or replace function public.remove_wishlist_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.product_likes
    set like_count = greatest(0, like_count - 1)
    where product_id = old.product_id;
  return old;
end;
$$;

drop trigger if exists on_wishlist_delete_drop_like_count on public.wishlist;
create trigger on_wishlist_delete_drop_like_count
  after delete on public.wishlist
  for each row execute function public.remove_wishlist_like();
