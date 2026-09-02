-- Added: 2026-08-29 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- The feed value pulled into gold_rates.rate_24kt_per_10g was stored
-- as-is, but it's actually a ₹-per-100-gram figure, not per-10-gram —
-- update-gold-rate/index.ts now divides by 10 before storing (see
-- that file's latest version), but the row already sitting in the
-- table from before that fix is still 10x too high. This corrects it
-- immediately instead of waiting for the next hourly run.
-- =========================================================

update public.gold_rates
set rate_24kt_per_10g = rate_24kt_per_10g / 10,
    updated_at = now()
where id = 1;
