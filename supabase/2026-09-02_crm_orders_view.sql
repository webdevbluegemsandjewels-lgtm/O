-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- A single, easy-to-read "CRM" view of every order line item, joining
-- orders + order_items/mens_order_items + products/mens_products +
-- profiles into one flat row per product ordered. Built as a VIEW,
-- not a table: it always reflects live data (no sync trigger to
-- maintain, can never go stale), and reads exactly like a table —
-- `select * from public.crm_orders` — with none of the join logic
-- exposed to whoever's querying it.
--
-- Column names, mapped from your list:
--   user id             -> user_id
--   username             -> customer_name, customer_email (no separate
--                           "username" column exists on this site —
--                           these are the closest real fields: profiles
--                           .full_name, falling back to the account's
--                           auth email)
--   productid            -> product_id
--   productname           -> product_name
--   gold                  -> metal_type      (e.g. "18 Kt Gold" — the
--                                             karat selected at checkout)
--   diamond               -> diamond_quality (e.g. "GH-VS-SI")
--   size                  -> size
--   category              -> category
--   image                 -> image
--   color                 -> color
--   pricetopayfromcutomer -> unit_price (₹ for one unit) and
--                            line_total (unit_price × quantity — the
--                            actual amount owed for this line)
--   razorpayorderid       -> razorpay_order_id
--   razorpaymentid        -> razorpay_payment_id
--   payment status        -> payment_status
--
-- Security: this view is NOT granted to anon/authenticated (see
-- revokes below) — it combines customer names/emails with payment
-- data, so it's for internal/admin use only (Supabase SQL Editor or
-- service-role access), never the public frontend.
-- =========================================================

create or replace view public.crm_orders as
select
  o.id                              as order_id,
  o.user_id                         as user_id,
  coalesce(p.full_name, u.email)    as customer_name,
  coalesce(p.email, u.email)        as customer_email,
  oi.product_id                     as product_id,
  pr.name                           as product_name,
  pr.category                       as category,
  pr.image                          as image,
  oi.color                          as color,
  oi.selected_metal_type            as metal_type,
  oi.selected_diamond_quality       as diamond_quality,
  oi.selected_size                  as size,
  oi.quantity                       as quantity,
  oi.price                          as unit_price,
  oi.price * oi.quantity            as line_total,
  o.razorpay_order_id               as razorpay_order_id,
  o.razorpay_payment_id             as razorpay_payment_id,
  o.status                          as payment_status,
  o.created_at                      as ordered_at
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.products pr on pr.id = oi.product_id
left join public.profiles p on p.id = o.user_id
left join auth.users u on u.id = o.user_id

union all

select
  o.id                              as order_id,
  o.user_id                         as user_id,
  coalesce(p.full_name, u.email)    as customer_name,
  coalesce(p.email, u.email)        as customer_email,
  mi.product_id                     as product_id,
  mp.name                           as product_name,
  mp.category                       as category,
  mp.image                          as image,
  mi.color                          as color,
  mi.selected_metal_type            as metal_type,
  mi.selected_diamond_quality       as diamond_quality,
  mi.selected_size                  as size,
  mi.quantity                       as quantity,
  mi.price                          as unit_price,
  mi.price * mi.quantity            as line_total,
  o.razorpay_order_id               as razorpay_order_id,
  o.razorpay_payment_id             as razorpay_payment_id,
  o.status                          as payment_status,
  o.created_at                      as ordered_at
from public.mens_order_items mi
join public.orders o on o.id = mi.order_id
join public.mens_products mp on mp.id = mi.product_id
left join public.profiles p on p.id = o.user_id
left join auth.users u on u.id = o.user_id;

revoke all on public.crm_orders from anon, authenticated;
