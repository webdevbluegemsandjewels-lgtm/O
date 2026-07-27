-- Populates the men's-only filter facets (see the columns added at
-- the bottom of the mens_products create table in
-- supabase/mens_schema.sql) by scanning each row's name + description
-- for keywords — same technique as supabase_schema.sql's `material`
-- derivation, just extended to the full OrenkaFine men's-jewelry
-- filter taxonomy the storefront's sidebar now mirrors:
--   Product Category (re-derived, finer-grained than the scraper's
--   categorize() buckets), Style, Metal, Stone Color, Gemstone,
--   Birthstone Month, Design Element, Significance, Enamel Color,
--   Collection, Division.
--
-- Run ONCE, after supabase/mens_schema.sql and
-- supabase/migrate_mens_products.sql, in the Supabase Dashboard SQL
-- Editor (service_role context). Every update below only touches
-- rows where the target column is still null (or, for the array
-- columns, empty), so it's safe to re-run without clobbering a value
-- you've corrected by hand.

-- ---------------------------------------------------------------
-- Product Category — refines category into the exact taxonomy the
-- filter sidebar uses. Order matters: compound/specific terms are
-- checked before the generic ones they'd otherwise be swallowed by
-- (e.g. "Cross Pendant" -> Cross Pendants, not Pendants; "Money Clip"
-- -> Money Clips, not swept into Rings' "else" bucket).
-- ---------------------------------------------------------------
update public.mens_products
set category = case
  when (name || ' ' || coalesce(description, '')) ilike '%cross%'
    and (name || ' ' || coalesce(description, '')) not ilike '%cufflink%' then 'Cross Pendants'
  when (name || ' ' || coalesce(description, '')) ilike '%money clip%' then 'Money Clips'
  when (name || ' ' || coalesce(description, '')) ilike '%cufflink%' then 'Cufflinks'
  when (name || ' ' || coalesce(description, '')) ilike '%bangle%' then 'Bangles'
  when (name || ' ' || coalesce(description, '')) ilike '%bracelet%'
    or (name || ' ' || coalesce(description, '')) ilike '%cuff%' then 'Bracelets'
  when (name || ' ' || coalesce(description, '')) ilike '%pendant%' then 'Pendants'
  when (name || ' ' || coalesce(description, '')) ilike '%necklace%'
    or (name || ' ' || coalesce(description, '')) ilike '%chain%' then 'Necklaces'
  when (name || ' ' || coalesce(description, '')) ilike '%lapel pin%'
    or (name || ' ' || coalesce(description, '')) ilike '%tie pin%'
    or (name || ' ' || coalesce(description, '')) ilike '%stick pin%'
    or (name || ' ' || coalesce(description, '')) ilike '% pin'
    or (name || ' ' || coalesce(description, '')) ilike '% pin %'
    or (name || ' ' || coalesce(description, '')) ilike 'pin %' then 'Pins'
  when (name || ' ' || coalesce(description, '')) ilike '%earring%'
    or (name || ' ' || coalesce(description, '')) ilike '%huggie%'
    or (name || ' ' || coalesce(description, '')) ilike '%stud%' then 'Earrings'
  when (name || ' ' || coalesce(description, '')) ilike '%ring%'
    or (name || ' ' || coalesce(description, '')) ilike '%band%' then 'Rings'
  else category
end;

-- ---------------------------------------------------------------
-- Style — single value, most-specific phrase wins (checked top to
-- bottom, first match kept).
-- ---------------------------------------------------------------
update public.mens_products
set style = case
  when (name || ' ' || coalesce(description, '')) ilike '%celtic knot%' then 'Celtic Knot'
  when (name || ' ' || coalesce(description, '')) ilike '%star of david%' then 'Star Of David'
  when (name || ' ' || coalesce(description, '')) ilike '%leather bracelet%' then 'Leather Bracelet'
  when (name || ' ' || coalesce(description, '')) ilike '%pendant necklace%' then 'Pendant Necklace'
  when (name || ' ' || coalesce(description, '')) ilike '%engagement ring%' then 'Mens Engagement Ring'
  when (name || ' ' || coalesce(description, '')) ilike '%money clip%' then 'Money Clip'
  when (name || ' ' || coalesce(description, '')) ilike '%cuff link%'
    or (name || ' ' || coalesce(description, '')) ilike '%cufflink%' then 'Cuff Link'
  when (name || ' ' || coalesce(description, '')) ilike '%dog tag%' then 'Dog Tag'
  when (name || ' ' || coalesce(description, '')) ilike '%rosary%' then 'Rosary'
  when (name || ' ' || coalesce(description, '')) ilike '%signet%' then 'Signet'
  when (name || ' ' || coalesce(description, '')) ilike '%medallion%' then 'Medallion'
  when (name || ' ' || coalesce(description, '')) ilike '%huggie%' then 'Huggie'
  when (name || ' ' || coalesce(description, '')) ilike '%bypass%' then 'Bypass'
  when (name || ' ' || coalesce(description, '')) ilike '%beaded%' then 'Beaded'
  when (name || ' ' || coalesce(description, '')) ilike '%bangle%' then 'Bangle'
  when (name || ' ' || coalesce(description, '')) ilike '%charm%' then 'Charm'
  when (name || ' ' || coalesce(description, '')) ilike '%cross%' then 'Cross'
  when (name || ' ' || coalesce(description, '')) ilike '%chain%' then 'Chain'
  when (name || ' ' || coalesce(description, '')) ilike '%stud%' then 'Stud'
  when (name || ' ' || coalesce(description, '')) ilike '% pin'
    or (name || ' ' || coalesce(description, '')) ilike '% pin %'
    or (name || ' ' || coalesce(description, '')) ilike 'pin %' then 'Pin'
  when (name || ' ' || coalesce(description, '')) ilike '%pendant%' then 'Pendant'
  when (name || ' ' || coalesce(description, '')) ilike '%anchor%' then 'Anchor'
  when (name || ' ' || coalesce(description, '')) ilike '%arrowhead%' then 'Arrowhead'
  when (name || ' ' || coalesce(description, '')) ilike '%band%'
    or (name || ' ' || coalesce(description, '')) ilike '%ring%' then 'Band'
  else style
end
where style is null;

-- ---------------------------------------------------------------
-- Metal — "Silver" wins if mentioned at all (OrenkaFine's silver
-- division is a distinct product line, not just another gold tone).
-- Otherwise built from the `colors` array seed_mens_products.sql
-- already assigned (1-3 gold tones per row): one tone -> "14k <tone>",
-- two -> "Two Tone Gold", three -> "Mixed Metal".
-- ---------------------------------------------------------------
update public.mens_products
set metal = case
  when (name || ' ' || coalesce(description, '')) ilike '%silver%'
    and (name || ' ' || coalesce(description, '')) ilike '%gold%' then 'Silver/14K Yellow Gold'
  when (name || ' ' || coalesce(description, '')) ilike '%silver%' then 'Silver'
  when array_length(colors, 1) >= 3 then 'Mixed Metal'
  when array_length(colors, 1) = 2 then 'Two Tone Gold'
  when colors[1] = 'Rose Gold' then '14k Rose Gold'
  when colors[1] = 'White Gold' then '14k White Gold'
  when colors[1] = 'Yellow Gold' then '14k Yellow Gold'
  else '14k Yellow Gold'
end
where metal is null;

-- ---------------------------------------------------------------
-- Gemstone (multi-value) + Stone Color (single value derived from
-- whichever gemstones were found, priority-ordered by color group).
-- ---------------------------------------------------------------
update public.mens_products
set gemstone = array_remove(array[
  case when (name || ' ' || coalesce(description, '')) ilike '%black diamond%' then 'Black Diamond' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%spinel%' then 'Black Spinel' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%topaz%' then 'Blue Topaz' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%garnet%' then 'Garnet' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%lapis%' then 'Lapis' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%malachite%' then 'Malachite' end,
  case
    when (name || ' ' || coalesce(description, '')) ilike '%matte onyx%' then 'Matte Onyx'
    when (name || ' ' || coalesce(description, '')) ilike '%onyx%' then 'Onyx'
  end,
  case when (name || ' ' || coalesce(description, '')) ilike '%multicolor%'
    or (name || ' ' || coalesce(description, '')) ilike '%multi-color%' then 'Multicolor Stones' end,
  case when has_diamond and (name || ' ' || coalesce(description, '')) not ilike '%black diamond%' then 'Natural Diamond' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%sapphire%' then 'Sapphire' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%sodalite%' then 'Sodalite' end
], null)
where gemstone is null;

update public.mens_products
set stone_color = case
  when gemstone && array['Black Diamond', 'Black Spinel', 'Matte Onyx', 'Onyx'] then 'Black'
  when gemstone && array['Blue Topaz', 'Lapis', 'Sapphire', 'Sodalite'] then 'Blue'
  when gemstone && array['Garnet'] then 'Red'
  when gemstone && array['Malachite'] then 'Green'
  when gemstone && array['Multicolor Stones'] then 'Multicolor'
  when gemstone && array['Natural Diamond'] then 'White'
  else stone_color
end
where stone_color is null and gemstone is not null and array_length(gemstone, 1) > 0;

-- ---------------------------------------------------------------
-- Birthstone Month — only the gemstones above with a standard
-- birthstone-chart month; most rows will have none, same sparsity
-- as OrenkaFine's own "Birthstone Month" filter (which only lists
-- September in the reference taxonomy).
-- ---------------------------------------------------------------
update public.mens_products
set birthstone_month = case
  when gemstone && array['Sapphire'] then 'September'
  when gemstone && array['Garnet'] then 'January'
  when gemstone && array['Blue Topaz'] then 'December'
  when gemstone && array['Natural Diamond'] then 'April'
  else birthstone_month
end
where birthstone_month is null and gemstone is not null and array_length(gemstone, 1) > 0;

-- ---------------------------------------------------------------
-- Design Element (multi-value).
-- ---------------------------------------------------------------
update public.mens_products
set design_element = array_remove(array[
  case when (name || ' ' || coalesce(description, '')) ilike '%cuban link%' then 'Cuban Link'
    when (name || ' ' || coalesce(description, '')) ilike '%cuban%' then 'Cuban' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%box chain%' then 'Box Chain' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%ball chain%' then 'Ball Chain' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%chain link%' then 'Chain Link' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%compass%' then 'Compass' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%dagger%' then 'Dagger' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%eagle%' then 'Eagle' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%dog tag%' then 'Dog Tag' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%cross%' then 'Cross' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%anchor%' then 'Anchor' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%arrowhead%' then 'Arrowhead' end
], null)
where design_element is null;

-- ---------------------------------------------------------------
-- Significance (multi-value) — derived from the facets above rather
-- than a fresh keyword scan.
-- ---------------------------------------------------------------
update public.mens_products
set significance = array_remove(array[
  case when design_element && array['Cross']
    or style in ('Cross', 'Rosary', 'Star Of David')
    or (name || ' ' || coalesce(description, '')) ilike '%rosary%'
    or (name || ' ' || coalesce(description, '')) ilike '%star of david%'
    then 'Spiritual and Religious' end,
  case when design_element && array['Anchor', 'Arrowhead', 'Compass', 'Dagger', 'Eagle', 'Dog Tag']
    then 'Meaningful Symbols' end,
  case when birthstone_month is not null then 'Birthstone' end,
  case when (name || ' ' || coalesce(description, '')) ilike '%engrav%' then 'Engravable' end
], null)
where significance is null;

-- ---------------------------------------------------------------
-- Enamel Color — only set when the piece is actually described as
-- enameled; most rows will have none.
-- ---------------------------------------------------------------
update public.mens_products
set enamel_color = case
  when (name || ' ' || coalesce(description, '')) ilike '%enamel%' and (name || ' ' || coalesce(description, '')) ilike '%black%' then 'Black'
  when (name || ' ' || coalesce(description, '')) ilike '%enamel%' and (name || ' ' || coalesce(description, '')) ilike '%blue%' then 'Blue'
  else enamel_color
end
where enamel_color is null;

-- ---------------------------------------------------------------
-- Collection — literal OrenkaFine collection/line names; "Diamond"
-- is the catch-all bucket for diamond pieces that don't name a
-- specific line, matching OrenkaFine's own taxonomy. Most rows will
-- have none, same sparsity as the real filter.
-- ---------------------------------------------------------------
update public.mens_products
set collection = case
  when (name || ' ' || coalesce(description, '')) ilike '%bujukan%' then 'Bujukan'
  when (name || ' ' || coalesce(description, '')) ilike '%facets%' then 'Facets'
  when (name || ' ' || coalesce(description, '')) ilike '%hampton%' then 'Hampton'
  when (name || ' ' || coalesce(description, '')) ilike '%polaris%' then 'Polaris'
  when (name || ' ' || coalesce(description, '')) ilike '%forged in love%' then 'Forged in Love'
  when (name || ' ' || coalesce(description, '')) ilike '%vita ex morte%' then 'Vita Ex Morte'
  when (name || ' ' || coalesce(description, '')) ilike '%contemporary%' then 'Contemporary'
  when (name || ' ' || coalesce(description, '')) ilike '%classic%' then 'Classic'
  when has_diamond then 'Diamond'
  else collection
end
where collection is null;

-- ---------------------------------------------------------------
-- Division — Orenka's men's silver line vs. everything else. Named
-- "Orenka", not "OrenkaFine", to match the men's line's own branding
-- (see mens-collection.html/product-men.html: "Orenka Men").
-- ---------------------------------------------------------------
update public.mens_products
set division = case
  when metal ilike '%silver%' then 'Orenka Men Silver'
  else 'Orenka Mens Fashion'
end
where division is null;

-- Corrects rows already populated by an earlier run of this file
-- (before the division values were renamed, first from "Gabriel ..."
-- to "OrenkaFine ...", then from "OrenkaFine ..." to "Orenka ..." to
-- match the men's line's actual branding) — the guard on the update
-- above only fills NULLs, so it wouldn't touch those on its own. Safe
-- no-op if nothing matches. See also
-- supabase/replace_gabriel_with_orenka.sql, which also sweeps any
-- leftover "Gabriel" text out of scraped product names/descriptions,
-- not just this column.
update public.mens_products set division = 'Orenka Men Silver' where division in ('Gabriel Men Silver', 'OrenkaFine Men Silver');
update public.mens_products set division = 'Orenka Mens Fashion' where division in ('Gabriel Mens Fashion', 'OrenkaFine Mens Fashion');
