-- Added: 2026-09-04 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Splits the combined "Charms & Pendants" category into two real
-- categories, "Pendants" and "Charms", matching the site's new
-- 5-category shop nav (Rings, Bracelets, Earrings, Pendants, Charms —
-- Necklaces and Ear Cuffs have been dropped from the frontend).
--
-- Split rule: every "Charms & Pendants" row whose name mentions
-- "charm" becomes category = 'Charms'; everything else (plain
-- "...Pendant" names) becomes category = 'Pendants'. Checked against
-- the live table on 2026-09-04: 84 rows total, 81 name-matched
-- "Charms", 3 of those active vs. 0 active; 3 matched "Pendants",
-- all 3 currently active. Collections.html's SHOP_CATS and
-- js/products.js's CATEGORIES already expect these two exact string
-- values — no further frontend change needed once this runs.
-- =========================================================

update public.products
set category = 'Charms'
where category = 'Charms & Pendants'
  and name ilike '%charm%';

update public.products
set category = 'Pendants'
where category = 'Charms & Pendants'
  and name not ilike '%charm%';
