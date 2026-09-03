-- Added: 2026-09-03 — run once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Tracks whether CRM staff have looked at an order yet, so the
-- dashboard (crm-dashboard.html) can show a "Viewed" column and a
-- "New / Unviewed only" filter.
--
-- One row per order. An order is marked viewed the moment staff
-- either click into its row (opening the detail panel) or download
-- something for it (the order PDF or the Product Details PDF) — both
-- handled by the crm-orders Edge Function's "mark_viewed" action.
-- There's no per-staff login (see 2026-09-02_crm_orders_view.sql), so
-- "viewed_by" just records the shared admin username that was used.
--
-- Internal/staff-only — same access model as crm_orders: no
-- anon/authenticated grants, only the service role (via the Edge
-- Function) can read or write it.
-- =========================================================

create table if not exists public.crm_order_views (
  order_id uuid primary key references public.orders(id) on delete cascade,
  viewed boolean not null default false,
  viewed_by text,
  viewed_at timestamptz,
  view_count integer not null default 0
);

revoke all on public.crm_order_views from anon, authenticated;

-- Re-create crm_orders with a trailing "viewed" column, so the same
-- flat CRM view used for ad-hoc SQL Editor queries also reflects
-- view state, not just what the dashboard's own fetch returns.
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
  o.created_at                      as ordered_at,
  coalesce(v.viewed, false)         as viewed

from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.products pr on pr.id = oi.product_id
left join public.profiles p on p.id = o.user_id
left join auth.users u on u.id = o.user_id
left join public.crm_order_views v on v.order_id = o.id

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
  o.created_at                      as ordered_at,
  coalesce(v.viewed, false)         as viewed
from public.mens_order_items mi
join public.orders o on o.id = mi.order_id
join public.mens_products mp on mp.id = mi.product_id
left join public.profiles p on p.id = o.user_id
left join auth.users u on u.id = o.user_id
left join public.crm_order_views v on v.order_id = o.id;

revoke all on public.crm_orders from anon, authenticated;
