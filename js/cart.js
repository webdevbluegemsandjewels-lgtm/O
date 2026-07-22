/* =========================================================
   OrenkaFine — cart (localStorage for guests, Supabase for logged-in users)

   Behavior:
   - Signed out: cart lives in localStorage on this device only (same as before).
   - Signed in: cart lives in the `cart_items` table, so it follows the
     account across devices.
   - The moment someone logs in, whatever was in their local guest cart
     gets merged into their account cart (quantities added together),
     then the local copy is cleared.

   Each line is keyed by product + every selected option (color, size,
   metal type, diamond quality) — not just product + color — since
   product.html lets those vary independently and each combination can
   have its own price. unit_price is stored per line (not just looked
   up from products.price) because product.html computes price live
   from karat/diamond/size selections, not a single fixed value.

   Public API is unchanged in shape except updateQty/removeItem, which
   now take a variantKey object instead of positional (id, color) —
   every method is async, callers need `await`:
     await window.OrenkaFineCart.getItems()
     await window.OrenkaFineCart.addItem(product, qty)
     await window.OrenkaFineCart.updateQty(variantKey, qty)
     await window.OrenkaFineCart.removeItem(variantKey)
     await window.OrenkaFineCart.clearCart()
     await window.OrenkaFineCart.getSubtotal()

   variantKey / product shape: { id, color, size, metalType, diamondQuality }
   ========================================================= */

const OrenkaFine_CART_KEY = "OrenkaFine_cart_v1";

// ---------- guest (localStorage) cart ----------

function readLocalCart() {
  try {
    const raw = localStorage.getItem(OrenkaFine_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Cart read error:", e);
    return [];
  }
}

function writeLocalCart(items) {
  localStorage.setItem(OrenkaFine_CART_KEY, JSON.stringify(items));
}

function matchesVariant(item, key) {
  return item.id === key.id
    && (item.color || null) === (key.color || null)
    && (item.size || null) === (key.size || null)
    && (item.metalType || null) === (key.metalType || null)
    && (item.diamondQuality || null) === (key.diamondQuality || null);
}

// ---------- shared ----------

async function getCurrentUserId() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? data.session.user.id : null;
  } catch (e) {
    return null;
  }
}

function notifyCartUpdated(items) {
  window.dispatchEvent(new CustomEvent("OrenkaFine:cart-updated", { detail: { items } }));
}

// ---------- account (Supabase) cart ----------

async function fetchDbCart(userId) {
  const { data, error } = await supabaseClient
    .from("cart_items")
    .select("product_id, color, quantity, selected_size, selected_metal_type, selected_diamond_quality, unit_price, products(name, image, price, slug)")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load account cart:", error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.product_id,
    slug: row.products?.slug,
    name: row.products?.name,
    image: row.products?.image,
    // unit_price is the exact price selected on product.html (varies by
    // karat/diamond/size); older rows without it fall back to the live
    // product price.
    price: row.unit_price != null ? Number(row.unit_price) : row.products?.price,
    color: row.color || null,
    size: row.selected_size || null,
    metalType: row.selected_metal_type || null,
    diamondQuality: row.selected_diamond_quality || null,
    qty: row.quantity,
  }));
}

// Returns true on success, false on failure (and logs why) — callers
// need this so they don't wipe data (e.g. the guest cart) based on an
// operation that silently didn't actually happen.
async function upsertDbCartItem(userId, product, qtyDelta) {
  const colorKey = product.color || "";
  const sizeKey = product.size || "";
  const metalKey = product.metalType || "";
  const diamondKey = product.diamondQuality || "";

  const { data: existing, error: selectErr } = await supabaseClient
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .eq("color", colorKey)
    .eq("selected_size", sizeKey)
    .eq("selected_metal_type", metalKey)
    .eq("selected_diamond_quality", diamondKey)
    .maybeSingle();

  if (selectErr) {
    console.error("Cart: failed to look up existing cart_items row (has supabase_schema.sql been run against this database?):", selectErr.message);
    return false;
  }

  if (existing) {
    const update = { quantity: existing.quantity + qtyDelta, updated_at: new Date().toISOString() };
    if (product.price != null) update.unit_price = product.price;
    const { error } = await supabaseClient.from("cart_items").update(update).eq("id", existing.id);
    if (error) {
      console.error("Cart: failed to update cart_items row:", error.message);
      return false;
    }
  } else if (qtyDelta > 0) {
    const { error } = await supabaseClient.from("cart_items").insert({
      user_id: userId,
      product_id: product.id,
      color: colorKey,
      selected_size: sizeKey,
      selected_metal_type: metalKey,
      selected_diamond_quality: diamondKey,
      unit_price: product.price != null ? product.price : null,
      quantity: qtyDelta,
    });
    if (error) {
      console.error("Cart: failed to insert cart_items row:", error.message);
      return false;
    }
  }

  return true;
}

async function mergeLocalCartIntoAccount(userId) {
  const localItems = readLocalCart();
  if (!localItems.length) return;

  const results = await Promise.all(localItems.map((item) => upsertDbCartItem(userId, item, item.qty)));

  if (results.every(Boolean)) {
    writeLocalCart([]); // everything made it into the account cart — safe to clear the guest copy
  } else {
    console.error("Cart: guest cart was NOT fully merged into the account cart — leaving localStorage untouched so nothing is lost. Check the errors above (a common cause is supabase_schema.sql not having been run yet).");
  }
}

// ---------- public API ----------

async function getItems() {
  const userId = await getCurrentUserId();
  return userId ? fetchDbCart(userId) : readLocalCart();
}

async function addItem(product, qty = 1) {
  const userId = await getCurrentUserId();
  const normalized = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    price: product.price,
    color: product.color || null,
    size: product.size || null,
    metalType: product.metalType || null,
    diamondQuality: product.diamondQuality || null,
  };

  if (userId) {
    const ok = await upsertDbCartItem(userId, normalized, qty);
    if (!ok) console.error("Cart: addItem did not actually save (see error above) — the UI may still show 'Added' even though nothing was stored.");
  } else {
    const items = readLocalCart();
    const existing = items.find((i) => matchesVariant(i, normalized));
    if (existing) {
      existing.qty += qty;
      existing.price = normalized.price; // keep price current for this exact combination
    } else {
      items.push({ ...normalized, qty });
    }
    writeLocalCart(items);
  }

  const items = await getItems();
  await updateCartBadge();
  notifyCartUpdated(items);
}

async function updateQty(variantKey, qty) {
  const userId = await getCurrentUserId();

  if (userId) {
    const colorKey = variantKey.color || "";
    const sizeKey = variantKey.size || "";
    const metalKey = variantKey.metalType || "";
    const diamondKey = variantKey.diamondQuality || "";

    if (qty <= 0) {
      await supabaseClient
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", variantKey.id)
        .eq("color", colorKey)
        .eq("selected_size", sizeKey)
        .eq("selected_metal_type", metalKey)
        .eq("selected_diamond_quality", diamondKey);
    } else {
      await supabaseClient
        .from("cart_items")
        .update({ quantity: qty, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("product_id", variantKey.id)
        .eq("color", colorKey)
        .eq("selected_size", sizeKey)
        .eq("selected_metal_type", metalKey)
        .eq("selected_diamond_quality", diamondKey);
    }
  } else {
    let items = readLocalCart();
    if (qty <= 0) {
      items = items.filter((i) => !matchesVariant(i, variantKey));
    } else {
      const item = items.find((i) => matchesVariant(i, variantKey));
      if (item) item.qty = qty;
    }
    writeLocalCart(items);
  }

  const items = await getItems();
  await updateCartBadge();
  notifyCartUpdated(items);
}

async function removeItem(variantKey) {
  await updateQty(variantKey, 0);
}

async function clearCart() {
  const userId = await getCurrentUserId();
  if (userId) {
    await supabaseClient.from("cart_items").delete().eq("user_id", userId);
  } else {
    writeLocalCart([]);
  }
  await updateCartBadge();
  notifyCartUpdated([]);
}

async function getSubtotal() {
  const items = await getItems();
  return items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
}

async function updateCartBadge() {
  const items = await getItems();
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count > 0 ? String(count) : "";
    el.style.display = count > 0 ? "inline-flex" : "none";
  });
}

window.OrenkaFineCart = {
  getItems,
  addItem,
  updateQty,
  removeItem,
  clearCart,
  getSubtotal,
};

// Merge guest cart into account cart the moment someone signs in,
// and keep the badge in sync with auth state generally.
document.addEventListener("DOMContentLoaded", async () => {
  await updateCartBadge();

  // Safety net for OAuth (Google) sign-in: that flow does a full
  // page redirect to the provider and back, so this script re-runs
  // fresh on return and can miss (or race) the SIGNED_IN event while
  // supabase-js is still parsing the session out of the redirect
  // URL. Email/password login doesn't navigate away, so its
  // SIGNED_IN event is always caught by the listener below — but
  // here, if we land on the page already signed in with leftover
  // guest-cart items in localStorage, merge them right away instead
  // of waiting on an event that may not fire in time.
  const initialUserId = await getCurrentUserId();
  if (initialUserId && readLocalCart().length) {
    await mergeLocalCartIntoAccount(initialUserId);
    await updateCartBadge();
    notifyCartUpdated(await getItems());
  }

  supabaseClient.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_IN") {
      const userId = await getCurrentUserId();
      if (userId) {
        await mergeLocalCartIntoAccount(userId);
        await updateCartBadge();
        notifyCartUpdated(await getItems());
      }
    } else if (event === "SIGNED_OUT") {
      await updateCartBadge();
      notifyCartUpdated(await getItems());
    }
  });
});
