-- TEMPORARY TEST-ONLY PATCH — run this to make a cart reminder fire
-- right away instead of waiting 3 days, so you can confirm the whole
-- pipeline (trigger -> row -> edge function -> email) actually works.
--
-- After you've confirmed the test email arrives, RUN
-- 2026-09-10_cart_reminders.sql AGAIN to restore the real 3-day delay
-- (it's fully idempotent — safe to re-run any time).
-- =========================================================

create or replace function public.queue_cart_reminder()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_email text;
  v_product_name text;
  v_product_image text;
begin
  select full_name, email into v_name, v_email from public.profiles where id = new.user_id;
  select name, image into v_product_name, v_product_image from public.products where id = new.product_id;

  if v_email is null then
    return new;
  end if;

  insert into public.cart_reminders (
    user_id, user_name, user_email, cart_item_id, product_id, product_name, product_image,
    color, selected_size, selected_metal_type, selected_diamond_quality, quantity, unit_price,
    status, scheduled_at
  )
  values (
    new.user_id, v_name, v_email, new.id, new.product_id, v_product_name, v_product_image,
    new.color, new.selected_size, new.selected_metal_type, new.selected_diamond_quality,
    new.quantity, new.unit_price,
    'pending', now()  -- TEST ONLY: due immediately instead of now() + interval '3 days'
  );

  -- TEST ONLY: call send-cart-reminder right away instead of waiting for
  -- the hourly cron, so the email goes out within seconds of add-to-cart.
  perform net.http_post(
    url := 'https://xjepiecjsomrallliifj.supabase.co/functions/v1/send-cart-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXBpZWNqc29tcmFsbGxpaWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODgyMDEsImV4cCI6MjA5OTY2NDIwMX0.cSYAd2dJcYOUvnGc66wjWtjVcww12p2rhHetZwzRoms',
      'x-webhook-secret', '34004203a12010dbcbd455ec00b87c9f846e3651527b79cf'
    ),
    body := '{}'::jsonb
  );

  return new;
end;
$$;
