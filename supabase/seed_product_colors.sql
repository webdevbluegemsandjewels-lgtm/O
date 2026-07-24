-- Randomly assigns 1-3 gold colors to every product's `colors` column.
-- The products table has no anon/authenticated write policy on purpose
-- (see supabase_schema.sql) — run this once in the Supabase Dashboard
-- SQL Editor (service_role context), not from the frontend.

update public.products
set colors = (
  case floor(random() * 7)::int
    when 0 then array['Rose Gold']
    when 1 then array['Yellow Gold']
    when 2 then array['White Gold']
    when 3 then array['Rose Gold', 'Yellow Gold']
    when 4 then array['Rose Gold', 'White Gold']
    when 5 then array['Yellow Gold', 'White Gold']
    else array['Rose Gold', 'Yellow Gold', 'White Gold']
  end
);
