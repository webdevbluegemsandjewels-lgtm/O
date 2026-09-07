-- Removes the ₹1 test product added in
-- 2026-09-07_add_test_product_and_unlisted_flag.sql.
--
-- A plain DELETE fails here (order_items_product_id_fkey) if a test
-- order was actually placed against it — deleting the row would orphan
-- that order's line item. Deactivating instead removes it from the site
-- completely (product.html requires is_active = true to show a product)
-- while keeping the order record intact.
update public.products set is_active = false where slug = 'test-payment-1-rupee';

-- Only use this if you're certain no order was ever placed against it
-- (check first: select id from public.products where slug =
-- 'test-payment-1-rupee'; then select * from public.order_items where
-- product_id = that id). If order_items has no rows for it, this is
-- safe to run instead of the update above:
-- delete from public.products where slug = 'test-payment-1-rupee';

-- Optional: only run this if you also want to remove the is_unlisted
-- column entirely (e.g. no other unlisted/test products exist and you
-- don't plan to add any). If you drop it, also revert the
-- .eq("is_unlisted", false) filters in js/products-db.js and js/search.js
-- first, or every product listing query will start erroring.
-- alter table public.products drop column if exists is_unlisted;
