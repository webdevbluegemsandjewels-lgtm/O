-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Correction to 2026-08-29_fix_gold_rate_unit.sql: the Arihant feed's
-- "GOLD 999 WITH GST" price is already ₹-per-10-gram, not per-100-gram
-- as previously assumed. That earlier fix (and update-gold-rate/
-- index.ts before its latest change) wrongly divided the stored rate
-- by 10, leaving gold_rates.rate_24kt_per_10g 10x too low. The Edge
-- Function no longer divides; this restores the current row to match.
-- =========================================================

update public.gold_rates
set rate_24kt_per_10g = rate_24kt_per_10g * 10,
    updated_at = now()
where id = 1;
