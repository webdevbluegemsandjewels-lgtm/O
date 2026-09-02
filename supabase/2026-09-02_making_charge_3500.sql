-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Update making charge from ₹3,000/gram to ₹3,500/gram.
-- Affects public.pricing_settings (row id = 1), which
-- public.calculate_product_price() reads for every product's
-- Price Break Up. Safe to re-run.
-- =========================================================

update public.pricing_settings
set making_charge_per_gram = 3500,
    updated_at = now()
where id = 1;
