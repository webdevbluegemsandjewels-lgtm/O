-- Added: 2026-09-03 — run once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Adds a free-text "special remark" field the CRM dashboard's Edit
-- action writes to (e.g. "Rose gold, Size 16 inch, should not turn or
-- bend"). Internal/staff-only — not shown anywhere on the public site,
-- and not writable by anon/authenticated (only the crm-orders Edge
-- Function, via the service role key, can set it).
-- =========================================================

alter table public.orders
  add column if not exists admin_notes text;
