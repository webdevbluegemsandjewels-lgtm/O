-- Added: 2026-09-09 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- signup.html now collects a Country field (dynamic country dropdown
-- alongside the existing city/state, see js/geo-data.js), sent as
-- raw_user_meta_data->>'country' on signUp(). This adds the matching
-- column to public.profiles and updates handle_new_user() to copy it
-- across, same pattern as address_line1/city/state/pincode.
-- Safe to re-run.
-- =========================================================

alter table public.profiles add column if not exists country text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, address_line1, address_line2, city, state, country, pincode)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email,
    new.raw_user_meta_data ->> 'address_line1',
    new.raw_user_meta_data ->> 'address_line2',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'state',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'pincode'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
