/* Product wishlist toggling — shared by the product-grid heart button
   (js/main.js's productCardHTML, rendered on index.html/collections.html/
   product.html's "You may also like" row) and product.html's own
   single-product save button. Both just need a
   <button data-wish-toggle data-product-id="..." data-product-name="...">
   (optionally with a nested [data-role="wish-label"] span to swap
   "Save to Wishlist" / "Saved") — everything else (click handling,
   liked-state hydration) is wired up here automatically.

   Purely a private "did I save this" toggle — no public like counts
   are shown or stored (see supabase/2026-09-11_product_likes.sql for
   the removed count-tracking table this replaced). See wishlist.html
   for where a signed-in visitor reviews everything they've saved. */

async function fetchUserWishlistSet(userId, productIds) {
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

function setWishButtonState(btn, liked, silent) {
  btn.classList.toggle("liked", liked);
  btn.dataset.liked = liked ? "true" : "false";
  const labelEl = btn.querySelector('[data-role="wish-label"]');
  if (labelEl) labelEl.textContent = liked ? "Saved" : "Save to Wishlist";
  // Lets a page like wishlist.html react (e.g. remove the card) the
  // moment a save is actually confirmed/undone, without needing to
  // know anything about how the toggle itself works.
  if (!silent) {
    btn.dispatchEvent(new CustomEvent("wish:changed", {
      bubbles: true,
      detail: { liked, productId: btn.dataset.productId },
    }));
  }
}

// Hydrates every not-yet-hydrated wish button under `root` with
// whether the current visitor has already saved that product. Safe
// to call repeatedly (e.g. after a grid re-renders on filter change)
// — already-hydrated buttons are skipped.
async function hydrateProductWishButtons(root = document) {
  const buttons = Array.from(root.querySelectorAll("[data-wish-toggle][data-product-id]:not([data-hydrated])"))
    .filter((b) => b.dataset.productId);
  if (!buttons.length) return;

  const ids = [...new Set(buttons.map((b) => b.dataset.productId))];
  const user = typeof getCurrentUser === "function" ? await getCurrentUser() : null;
  const likedSet = await fetchUserWishlistSet(user ? user.id : null, ids);

  buttons.forEach((btn) => {
    btn.dataset.hydrated = "true";
    if (likedSet.has(btn.dataset.productId)) setWishButtonState(btn, true, /* silent */ true);
  });
}

async function toggleProductLike(button) {
  const productId = button.dataset.productId;
  const productName = button.dataset.productName || "";
  if (!productId || button.disabled) return;

  const user = typeof requireAuth === "function" ? await requireAuth() : null;
  if (!user) return;

  const wasLiked = button.dataset.liked === "true";

  // Optimistic UI so the heart responds instantly, but held silent —
  // the "wish:changed" event only fires once the write actually
  // succeeds, so a listener (e.g. wishlist.html removing a card)
  // never has to unwind a failed/rolled-back guess.
  button.disabled = true;
  setWishButtonState(button, !wasLiked, /* silent */ true);

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
    setWishButtonState(button, !wasLiked); // confirmed — now tell listeners.
  } catch (err) {
    console.warn("Could not update wishlist:", err.message || err);
    setWishButtonState(button, wasLiked, /* silent */ true);
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
  // wish buttons showing up anywhere on the page.
  const observer = new MutationObserver(() => hydrateProductWishButtons(document));
  observer.observe(document.body, { childList: true, subtree: true });
});
