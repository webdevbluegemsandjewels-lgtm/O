-- Adds an is_unlisted flag to products: true means the product is real
-- and purchasable (RLS still requires is_active = true to be readable
-- at all), but is excluded from every general "load all products" query
-- (collections.html, index.html recommendations, site search) — see the
-- matching .eq("is_unlisted", false) filters added in js/products-db.js
-- and js/search.js. product.html fetches by exact slug and does NOT
-- filter on is_unlisted, so an unlisted product is only reachable if you
-- already have its direct product.html?slug=... link.
alter table public.products add column if not exists is_unlisted boolean not null default false;

-- ₹1 test product, used to test the live Razorpay payment flow end to
-- end without exposing it anywhere on the site.
insert into public.products (
  slug, name, brand, category, price, image, description,
  is_active, is_unlisted, stock, gold_type
)
values (
  'test-payment-1-rupee',
  'Test Product — ₹1',
  'OrenkaFine',
  'Test',
  1,
  null,
  'Internal use only — for testing the live payment flow. Not a real product.',
  true,
  true,
  100,
  '9 karat gold'
)
on conflict (slug) do update set
  price = 1,
  is_active = true,
  is_unlisted = true,
  stock = 100;
