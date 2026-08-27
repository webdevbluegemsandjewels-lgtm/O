-- Backfills the same catalog fields for gender = 'Men' rows that
-- seed_product_colors.sql / seed_product_specs.sql / the material
-- update in supabase_schema.sql already fill in for the rest of the
-- catalog. scrape-gabriel-mens.js (kept outside this repo, on the
-- Desktop) only sets slug/name/brand/category/gender/price/image/
-- stock — colors, gold_weight_grams, material, and the price-breakup
-- columns are left null/empty on insert, which is exactly the gap
-- this closes, scoped to gender = 'Men' so it never touches existing
-- women's rows.
--
-- Run this ONCE in the Supabase Dashboard SQL Editor (service_role
-- context) after running the `gender` column addition in
-- supabase_schema.sql and after scrape-gabriel-mens.js has upserted
-- the men's rows. Safe to re-run — every update is guarded so it
-- only fills columns that are still null/empty, it never reshuffles
-- a value you (or a previous run) already set.

-- ---------------------------------------------------------------
-- Colors — same Rose/Yellow/White Gold combinations as
-- seed_product_colors.sql, but only for Men rows with no colors yet.
-- ---------------------------------------------------------------
update public.products
set colors = (
  case floor(random() * 7)::int
    when 0 then array['Rose Gold']
    when 1 then array['Yellow Gold']
    when 2 then array['White Gold']
    when 3 then array['Rose Gold', 'Yellow Gold']
    when 4 then array['Rose Gold', 'White Gold']
    when 5 then array['Yellow Gold', 'White Gold']
    else array['Rose Gold', 'Yellow Gold', 'White Gold']
  end
)
where gender = 'Men'
  and (colors is null or array_length(colors, 1) is null);

-- ---------------------------------------------------------------
-- Material — same keyword scan as supabase_schema.sql's material
-- update, reading name + description to tell Gold-only, Diamond, or
-- combination pieces apart. Compound phrases checked before the
-- single words they contain, same ordering reasoning as the global
-- version.
-- ---------------------------------------------------------------
update public.products
set material = case
  when (name || ' ' || coalesce(description, '')) ilike '%emerald gold%'   then 'Emerald Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%evil eye gold%'  then 'Evil Eye Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%ruby gemstones%' then 'Ruby Gemstones'
  when (name || ' ' || coalesce(description, '')) ilike '%ruby gold%'      then 'Ruby Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%baguette%'       then 'Baguette'
  when (name || ' ' || coalesce(description, '')) ilike '%marquise%'       then 'Marquise'
  when (name || ' ' || coalesce(description, '')) ilike '%diamond%'        then 'Diamond'
  when (name || ' ' || coalesce(description, '')) ilike '%emerald%'        then 'Emerald'
  when (name || ' ' || coalesce(description, '')) ilike '%gold%'           then 'Gold'
  else material
end
where gender = 'Men'
  and material is null;

-- has_diamond needs no seeding — it's a generated column
-- (`name ilike '%diamond%'`, see supabase_schema.sql), so it's
-- already correct for every men's row the moment the name is set.

-- gold_type is left null on purpose: product.html already falls
-- back to "18 karat gold" display text when the column is null
-- (js/products-db.js: `row.gold_type || "18 karat gold"`), matching
-- how existing rows without an explicit karat behave.

-- ---------------------------------------------------------------
-- Gold weight — no per-item weight data comes off the scraped source
-- site (unlike the scraped women's variants, which is why product.html's
-- sizeIsReal path exists), so this fills a realistic range per
-- category the same way seed_product_specs.sql randomizes width/
-- thickness elsewhere. Men's pieces run heavier than the equivalent
-- women's category (chains, cufflinks, money clips especially), so
-- these ranges are set separately rather than reusing any women's
-- default.
-- ---------------------------------------------------------------
update public.products
set gold_weight_grams = round((
  case category
    when 'Rings'              then 5  + random() * 7   -- 5–12g
    when 'Bracelets'           then 15 + random() * 20  -- 15–35g (bangles + chain bracelets + cuffs)
    when 'Necklaces'           then 15 + random() * 25  -- 15–40g (chains)
    when 'Charms & Pendants'   then 3  + random() * 7   -- 3–10g
    when 'Cufflinks'           then 10 + random() * 10  -- 10–20g (pair)
    when 'Money Clips'         then 20 + random() * 20  -- 20–40g
    when 'Earrings'            then 2  + random() * 4   -- 2–6g
    else 5 + random() * 10                              -- 5–15g fallback
  end
)::numeric, 2)
where gender = 'Men'
  and gold_weight_grams is null;

-- ---------------------------------------------------------------
-- Price Break Up panel columns — same fields/logic as
-- seed_product_specs.sql, scoped to Men rows still missing them.
-- diamond_weight_ct / diamond_share_pct only get set when
-- has_diamond is true; gold_share_pct is computed last so the four
-- shares always sum to exactly 100.
-- ---------------------------------------------------------------
update public.products
set gst_share_pct = coalesce(gst_share_pct, 3)
where gender = 'Men'
  and gst_share_pct is null;

-- Added: 2026-08-27 — width_mm/thickness_mm are real physical
-- measurements, not something safe to guess with random(). See the
-- matching note in seed_product_specs.sql.
update public.products
set
  product_code = coalesce(product_code, 'GM' || lpad(floor(random() * 900 + 100)::int::text, 3, '0')),
  diamond_weight_ct = case
    when has_diamond then coalesce(diamond_weight_ct, round((0.05 + random() * 0.85)::numeric, 2))
    else null
  end,
  diamond_share_pct = case
    when has_diamond then coalesce(diamond_share_pct, round((15 + random() * 15)::numeric, 1))
    else 0
  end,
  making_share_pct = coalesce(making_share_pct, round((8 + random() * 7)::numeric, 1))
where gender = 'Men';

update public.products
set gold_share_pct = coalesce(gold_share_pct, round((100 - coalesce(diamond_share_pct, 0) - coalesce(making_share_pct, 0) - coalesce(gst_share_pct, 0))::numeric, 1))
where gender = 'Men'
  and gold_share_pct is null;

-- ---------------------------------------------------------------
-- Sizes / "neck size" — deliberately NOT seeded here. product.html
-- picks a size range purely from `category` + product name, with no
-- DB column involved:
--   Rings                                  -> 06–16 ring sizes
--   Bracelets (name matches /bangle/i)      -> 2.0–2.5 bangle sizes
--   Bracelets (everything else)             -> 06–08 wrist sizes
--   Necklaces / Charms & Pendants           -> 14–18 inch chain/neck sizes
--   Cufflinks / Money Clips / Earrings      -> no size picker shown
-- This already applies to every men's row the moment category and
-- name are set by the scraper — see the RING_SIZE_FALLBACK /
-- BANGLE_SIZE_FALLBACK / BRACELET_SIZE_FALLBACK / NECKLACE_SIZE_
-- FALLBACK constants in product.html. It only switches to real
-- per-size product rows when siblings share a `woo_parent_id`, which
-- scrape-gabriel-mens.js does not set (each scraped item is its own
-- standalone row), so every men's item gets the fallback range for
-- its category — no SQL needed for that to work.
