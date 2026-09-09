-- Added: 2026-09-09 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- contact.html now also collects Phone (with a dynamic country-code
-- dropdown), Country, and State/City (dynamic dropdowns, same
-- dataset as signup.html — see js/geo-data.js). Adds the matching
-- columns to public.enquiries; supabase/functions/send-enquiry/
-- index.ts was updated to insert them. Safe to re-run.
-- =========================================================

alter table public.enquiries add column if not exists phone text;
alter table public.enquiries add column if not exists country text;
alter table public.enquiries add column if not exists state text;
alter table public.enquiries add column if not exists city text;
