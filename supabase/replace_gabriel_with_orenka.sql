-- Replaces any leftover "Gabriel" branding with "Orenka" across
-- public.mens_products. Two different situations this covers:
--
-- 1. The scraped `name` / `description` text itself can contain the
--    source site's own brand text (e.g. a product named
--    "Gabriel & Co. Men's Signet Ring") — scrape-gabriel-mens.js
--    copies whatever the site's data-item_name attribute says
--    verbatim, it doesn't strip this out.
-- 2. The generated filter-facet columns (see supabase/seed_mens_filters.sql)
--    that literally spell out "Gabriel Men Silver" / "Gabriel Mens
--    Fashion" for the Division facet — this is the men's-line
--    equivalent of the "Orenka Men" branding used everywhere else
--    (mens-collection.html, product-men.html), not "OrenkaFine".
--
-- Run in the Supabase Dashboard SQL Editor (service_role context),
-- any time after supabase/mens_schema.sql. Safe to re-run — every
-- update is a no-op once nothing matches.

-- ---------------------------------------------------------------
-- Free-text columns: case-insensitive, catches "Gabriel & Co.",
-- "Gabriel and Co", or a bare "Gabriel" and swaps in "Orenka".
-- Longer/more specific phrases are replaced first so a name like
-- "Gabriel & Co. Ring" doesn't end up as "Orenka & Co. Ring".
-- ---------------------------------------------------------------
update public.mens_products
set
  name = regexp_replace(regexp_replace(name, 'Gabriel\s*&\s*Co\.?', 'Orenka', 'gi'), 'Gabriel', 'Orenka', 'gi'),
  description = regexp_replace(regexp_replace(coalesce(description, ''), 'Gabriel\s*&\s*Co\.?', 'Orenka', 'gi'), 'Gabriel', 'Orenka', 'gi')
where name ilike '%gabriel%' or description ilike '%gabriel%';

update public.mens_products
set brand = regexp_replace(regexp_replace(brand, 'Gabriel\s*&\s*Co\.?', 'Orenka', 'gi'), 'Gabriel', 'Orenka', 'gi')
where brand ilike '%gabriel%';

-- ---------------------------------------------------------------
-- Filter-facet columns (style/metal/stone_color/birthstone_month/
-- enamel_color/collection) — only Division is expected to actually
-- contain "Gabriel" today, but this covers any of the others too in
-- case a future run of seed_mens_filters.sql ever reintroduces it.
-- ---------------------------------------------------------------
update public.mens_products set style = regexp_replace(style, 'Gabriel', 'Orenka', 'gi') where style ilike '%gabriel%';
update public.mens_products set metal = regexp_replace(metal, 'Gabriel', 'Orenka', 'gi') where metal ilike '%gabriel%';
update public.mens_products set stone_color = regexp_replace(stone_color, 'Gabriel', 'Orenka', 'gi') where stone_color ilike '%gabriel%';
update public.mens_products set birthstone_month = regexp_replace(birthstone_month, 'Gabriel', 'Orenka', 'gi') where birthstone_month ilike '%gabriel%';
update public.mens_products set enamel_color = regexp_replace(enamel_color, 'Gabriel', 'Orenka', 'gi') where enamel_color ilike '%gabriel%';
update public.mens_products set collection = regexp_replace(collection, 'Gabriel', 'Orenka', 'gi') where collection ilike '%gabriel%';

-- Division: explicit values, not a regexp — matches exactly what
-- seed_mens_filters.sql writes (and also corrects the "OrenkaFine Men
-- Silver" / "OrenkaFine Mens Fashion" wording from an earlier pass,
-- since the men's line uses "Orenka", not "OrenkaFine").
update public.mens_products set division = 'Orenka Men Silver' where division in ('Gabriel Men Silver', 'OrenkaFine Men Silver');
update public.mens_products set division = 'Orenka Mens Fashion' where division in ('Gabriel Mens Fashion', 'OrenkaFine Mens Fashion');
