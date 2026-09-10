-- Run this once, AFTER 2026-09-10_cart_reminders.sql, to queue
-- reminders for carts that already existed before the trigger did
-- (the trigger only fires on new inserts going forward).
--
-- Schedules each backfilled reminder at that cart line's own
-- created_at + 3 days — same rule the trigger uses for new carts —
-- so an item added 4 days ago becomes due immediately (next cron
-- tick), one added yesterday becomes due in ~2 more days, etc.
-- Skips any cart_items row that already has a reminder (so this is
-- safe to run more than once).
-- =========================================================

insert into public.cart_reminders (
  user_id, user_name, user_email, cart_item_id, product_id, product_name, product_image,
  color, selected_size, selected_metal_type, selected_diamond_quality, quantity, unit_price,
  status, scheduled_at
)
select
  ci.user_id, p.full_name, p.email, ci.id, ci.product_id, pr.name, pr.image,
  ci.color, ci.selected_size, ci.selected_metal_type, ci.selected_diamond_quality,
  ci.quantity, ci.unit_price,
  'pending', ci.created_at + interval '3 days'
from public.cart_items ci
join public.profiles p on p.id = ci.user_id
left join public.products pr on pr.id = ci.product_id
where p.email is not null
  and not exists (
    select 1 from public.cart_reminders cr where cr.cart_item_id = ci.id
  );
