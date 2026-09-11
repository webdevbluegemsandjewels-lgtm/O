/* Product "like"/wishlist toggling — shared by the product-grid heart
   button (js/main.js's productCardHTML, rendered on index.html/
   collections.html) and product.html's own single-product like button.
   Both just need a <button data-wish-toggle data-product-id="..."
   data-product-name="..."> with a nested [data-role="wish-count"] span;
   everything else (click handling, count/liked-state hydration) is
   wired up here automatically. */

async function fetchLikeCounts(productIds) {
  if (!productIds.length) return {};
  const { data, error } = await supabaseClient
    .from("product_likes")
    .select("product_id, like_count")
    .in("product_id", productIds);
  if (error) {
    console.warn("Could not load like counts:", error.message);
    return {};
  }
  const map = {};
  (data || []).forEach((row) => { map[row.product_id] = row.like_count; });
  return map;
}

async function fetchUserLikedSet(userId, productIds) {
  if (!userId || !productIds.length) return new Set();
  const { data, error } = await supabaseClient
    .from("wishlist")
    .select("product_id")
    .eq("user_id", userId)
    .in("product_id", productIds);
  if (error) {
    console.warn("Could not load wishlist state:", error.message);
    return new Set();
  }
  return new Set((data || []).map((row) => row.product_id));
}

// Hydrates every not-yet-hydrated like button under `root` with its
// real count + whether the current visitor has already liked it.
// Safe to call repeatedly (e.g. after a grid re-renders on filter
// change) — already-hydrated buttons are skipped.
async function hydrateProductWishButtons(root = document) {
  const buttons = Array.from(root.querySelectorAll("[data-wish-toggle][data-product-id]:not([data-hydrated])"))
    .filter((b) => b.dataset.productId);
  if (!buttons.length) return;

  const ids = [...new Set(buttons.map((b) => b.dataset.productId))];
  const user = typeof getCurrentUser === "function" ? await getCurrentUser() : null;
  const [counts, likedSet] = await Promise.all([
    fetchLikeCounts(ids),
    fetchUserLikedSet(user ? user.id : null, ids),
  ]);

  buttons.forEach((btn) => {
    btn.dataset.hydrated = "true";
    const id = btn.dataset.productId;
    const countEl = btn.querySelector('[data-role="wish-count"]');
    if (countEl) countEl.textContent = counts[id] || 0;
    if (likedSet.has(id)) {
      btn.classList.add("liked");
      btn.dataset.liked = "true";
    }
  });
}

async function toggleProductLike(button) {
  const productId = button.dataset.productId;
  const productName = button.dataset.productName || "";
  if (!productId || button.disabled) return;

  const user = typeof requireAuth === "function" ? await requireAuth() : null;
  if (!user) return;

  const countEl = button.querySelector('[data-role="wish-count"]');
  const currentCount = Number(countEl ? countEl.textContent : 0) || 0;
  const wasLiked = button.dataset.liked === "true";

  // Optimistic UI so the count/heart respond instantly.
  button.disabled = true;
  button.classList.toggle("liked", !wasLiked);
  button.dataset.liked = wasLiked ? "false" : "true";
  if (countEl) countEl.textContent = Math.max(0, currentCount + (wasLiked ? -1 : 1));

  try {
    if (wasLiked) {
      const { error } = await supabaseClient
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
      if (error) throw error;
    } else {
      let name = user.user_metadata?.full_name || null;
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.full_name) name = profile.full_name;

      const { error } = await supabaseClient.from("wishlist").insert({
        user_id: user.id,
        user_name: name,
        product_id: productId,
        product_name: productName,
      });
      // 23505 = unique_violation (already liked, e.g. a double click race) — treat as success.
      if (error && error.code !== "23505") throw error;
    }
  } catch (err) {
    console.warn("Could not update wishlist:", err.message || err);
    button.classList.toggle("liked", wasLiked);
    button.dataset.liked = wasLiked ? "true" : "false";
    if (countEl) countEl.textContent = currentCount;
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wish-toggle]");
  if (!btn) return;
  e.preventDefault();
  toggleProductLike(btn);
});

document.addEventListener("DOMContentLoaded", () => {
  hydrateProductWishButtons(document);
  // Product grids render their cards asynchronously (DB fetch, filter
  // changes) well after DOMContentLoaded, so keep watching for new
  // like buttons showing up anywhere on the page.
  const observer = new MutationObserver(() => hydrateProductWishButtons(document));
  observer.observe(document.body, { childList: true, subtree: true });
});
