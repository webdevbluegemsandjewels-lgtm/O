-- Run this once in Supabase Dashboard → SQL Editor.
-- =========================================================
-- Removes the public "X likes" count feature added in
-- 2026-09-11_product_likes.sql. The heart button is now a private
-- "save to my wishlist" toggle only (see js/likes.js + wishlist.html)
-- — nobody sees how many other shoppers liked a product.
--
-- public.wishlist (the per-user save/unsave record) is UNCHANGED and
-- keeps all existing rows — wishlist.html reads directly from it.
-- Only the aggregate count table + the triggers that maintained it
-- are removed.
-- =========================================================

drop trigger if exists on_wishlist_insert_bump_like_count on public.wishlist;
drop trigger if exists on_wishlist_delete_drop_like_count on public.wishlist;
drop function if exists public.apply_wishlist_like();
drop function if exists public.remove_wishlist_like();
drop table if exists public.product_likes;
