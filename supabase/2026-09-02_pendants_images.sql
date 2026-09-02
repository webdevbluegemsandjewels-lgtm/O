-- Added: 2026-09-02 — run this once in Supabase Dashboard → SQL Editor
-- =========================================================
-- Real product photos for the 3 pendants added in
-- 2026-09-02_pendants_category.sql, replacing the placeholder
-- Products/<slug>.png paths. Full https:// URLs pass straight
-- through toBucketUrl() in js/main.js unchanged, so no path
-- reformatting is needed.
-- =========================================================

update public.products set
  image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Hanu1.png',
  secondary_image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Hanu2.png'
where slug = 'gold-rudraksha-diamond-pendant';

update public.products set
  image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Ganesh1.png',
  secondary_image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Ganesh2.png'
where slug = 'gold-ganesha-heart-diamond-pendant';

update public.products set
  image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Ganeshholow1.png',
  secondary_image = 'https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/Products/Pendants/Ganeshholow2.png'
where slug = 'gold-ganesha-trunk-diamond-pendant';
