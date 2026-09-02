-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Contact page form submissions (contact.html) now save here instead
-- of being a no-op ("demo only, no backend" in js/main.js). The
-- send-enquiry Edge Function inserts rows here with the service role
-- key and also emails info@orenkafine.com — see
-- supabase/functions/send-enquiry/index.ts.
--
-- RLS allows anyone to INSERT (so the public contact form works
-- without login) but nobody can SELECT from the client — only the
-- service role (used by the Edge Function / dashboard) can read
-- submissions, so one visitor can't see another's enquiry.
-- =========================================================

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  topic text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.enquiries enable row level security;

drop policy if exists "Anyone can submit an enquiry" on public.enquiries;
create policy "Anyone can submit an enquiry"
  on public.enquiries for insert
  to anon, authenticated
  with check (true);
