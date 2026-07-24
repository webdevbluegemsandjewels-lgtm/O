-- Adds the columns the product-page "Price Break Up" panel needs, then
-- randomly fills any that are still empty. Same deal as
-- seed_product_colors.sql: products has no anon/authenticated write
-- policy on purpose, so this has to be run once in the Supabase
-- Dashboard SQL Editor (service_role context), not from the frontend.
--
-- Columns added (all nullable — the panel just hides a row if a
-- product's value is null):
--   product_code       text     e.g. "FE342" (shown as "Product Code")
--   width_mm            numeric  e.g. 2.9     (shown as "Width")
--   thickness_mm        numeric  e.g. 1.5     (shown as "Thickness")
--   diamond_weight_ct   numeric  e.g. 0.21    (only set when has_diamond)
--   gold_share_pct      numeric  percentage of price attributed to gold
--   diamond_share_pct   numeric  percentage of price attributed to diamond (0 when no diamond)
--   making_share_pct    numeric  percentage of price attributed to making charges
--   gst_share_pct       numeric  percentage of price attributed to GST
-- The four *_share_pct columns always add up to 100 per row, so the
-- ₹ breakdown the page computes from them (share% x price) always
-- sums back to the product's real price — it's an illustrative
-- breakdown, not a swap-in for real accounting/invoicing data.

alter table public.products
  add column if not exists product_code text,
  add column if not exists width_mm numeric,
  add column if not exists thickness_mm numeric,
  add column if not exists diamond_weight_ct numeric,
  add column if not exists gold_share_pct numeric,
  add column if not exists diamond_share_pct numeric,
  add column if not exists making_share_pct numeric,
  add column if not exists gst_share_pct numeric;

-- Fixed at India's 3% GST slab for gold/diamond jewellery — not randomized,
-- unlike the other shares, since GST rate is a legal figure, not a guess.
update public.products
set gst_share_pct = coalesce(gst_share_pct, 3)
where gst_share_pct is null;

update public.products
set
  product_code = coalesce(product_code, 'FE' || lpad(floor(random() * 900 + 100)::int::text, 3, '0')),
  width_mm = coalesce(width_mm, round((1.5 + random() * 4.5)::numeric, 1)),
  thickness_mm = coalesce(thickness_mm, round((1.0 + random() * 1.8)::numeric, 1)),
  diamond_weight_ct = case
    when has_diamond then coalesce(diamond_weight_ct, round((0.05 + random() * 0.85)::numeric, 2))
    else null
  end,
  diamond_share_pct = case
    when has_diamond then coalesce(diamond_share_pct, round((15 + random() * 15)::numeric, 1))
    else 0
  end,
  making_share_pct = coalesce(making_share_pct, round((8 + random() * 7)::numeric, 1));

-- Gold share is whatever's left after diamond + making + GST, computed
-- last so the four shares always sum to exactly 100.
update public.products
set gold_share_pct = coalesce(gold_share_pct, round((100 - coalesce(diamond_share_pct, 0) - coalesce(making_share_pct, 0) - coalesce(gst_share_pct, 0))::numeric, 1))
where gold_share_pct is null;
