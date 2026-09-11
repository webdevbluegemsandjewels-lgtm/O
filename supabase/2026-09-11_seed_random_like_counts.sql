-- One-time seed: give every product currently shown on the frontend
-- (public.products where is_active = true) a random starting
-- like_count, so the heart badges don't all show 0 before real
-- shoppers start liking things.
--
-- Range is 5-250 (inclusive) — edit the two numbers below to change it.
-- Safe to re-run: upserts, so it just overwrites existing counts with
-- a fresh random value each time you run it.

insert into public.product_likes (product_id, product_name, like_count)
select
  p.id,
  p.name,
  floor(random() * (250 - 5 + 1) + 5)::int
from public.products p
where p.is_active = true
on conflict (product_id) do update
  set like_count = excluded.like_count,
      product_name = excluded.product_name;
