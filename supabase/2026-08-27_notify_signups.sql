-- Added: 2026-08-27 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- notify_signups — "Notify Me" emails from coming-soon.html.
--
-- Write-only from the frontend: anon can INSERT (so the coming-soon
-- page can save an email) but cannot SELECT/UPDATE/DELETE, so no
-- public API key floating around in that HTML file can be used to
-- read back or scrape the list. View/export the emails yourself from
-- the Supabase Dashboard (Table Editor, or service_role in SQL
-- Editor) — no automated send-out is wired up; that's a manual step
-- for now per the user's own call.
-- =========================================================

create table if not exists public.notify_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.notify_signups enable row level security;

drop policy if exists "Anyone can sign up to be notified" on public.notify_signups;
create policy "Anyone can sign up to be notified"
  on public.notify_signups for insert
  to anon
  with check (true);
