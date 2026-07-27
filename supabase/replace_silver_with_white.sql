-- Replaces the word "silver" with "white" (case-insensitive) across
-- public.mens_products — both the free-text scraped fields and the
-- derived filter-facet columns from supabase/seed_mens_filters.sql
-- (metal, division, stone_color) that can literally spell out
-- "Silver".
--
-- Run in the Supabase Dashboard SQL Editor (service_role context),
-- any time after supabase/mens_schema.sql. Safe to re-run — every
-- update is a no-op once nothing matches.

update public.mens_products
set
  name = regexp_replace(name, 'silver', 'white', 'gi'),
  description = regexp_replace(coalesce(description, ''), 'silver', 'white', 'gi')
where name ilike '%silver%' or description ilike '%silver%';

update public.mens_products
set metal = regexp_replace(metal, 'silver', 'white', 'gi')
where metal ilike '%silver%';

update public.mens_products
set stone_color = regexp_replace(stone_color, 'silver', 'white', 'gi')
where stone_color ilike '%silver%';

update public.mens_products
set style = regexp_replace(style, 'silver', 'white', 'gi')
where style ilike '%silver%';

update public.mens_products
set collection = regexp_replace(collection, 'silver', 'white', 'gi')
where collection ilike '%silver%';

-- Division: explicit values (matches what seed_mens_filters.sql
-- writes: "Orenka Men Silver" / "Orenka Mens Fashion"), not a regexp.
update public.mens_products set division = 'Orenka Men White' where division = 'Orenka Men Silver';
