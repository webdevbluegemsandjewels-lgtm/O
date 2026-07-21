/* =========================================================
   OrenkaFine — cart (localStorage for guests, Supabase for logged-in users)

   Behavior:
   - Signed out: cart lives in localStorage on this device only (same as before).
   - Signed in: cart lives in the `cart_items` table, so it follows the
     account across devices.
   - The moment someone logs in, whatever was in their local guest cart
     gets merged into their account cart (quantities added together),
     then the local copy is cleared.

   Public API is unchanged in shape, but every method is now async —
   callers need `await`:
     await window.OrenkaFineCart.getItems()
     await window.OrenkaFineCart.addItem(product, qty)
     await window.OrenkaFineCart.updateQty(id, color, qty)
     await window.OrenkaFineCart.removeItem(id, color)
     await window.OrenkaFineCart.clearCart()
     await window.OrenkaFineCart.getSubtotal()
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
    .select("product_id, color, quantity, products(name, image, price, slug)")
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
    price: row.products?.price,
    color: row.color || null,
    qty: row.quantity,
  }));
}

async function upsertDbCartItem(userId, productId, color, qtyDelta) {
  const colorKey = color || "";

  const { data: existing } = await supabaseClient
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("color", colorKey)
    .maybeSingle();

  if (existing) {
    await supabaseClient
      .from("cart_items")
      .update({ quantity: existing.quantity + qtyDelta, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else if (qtyDelta > 0) {
    await supabaseClient
      .from("cart_items")
      .insert({ user_id: userId, product_id: productId, color: colorKey, quantity: qtyDelta });
  }
}

async function mergeLocalCartIntoAccount(userId) {
  const localItems = readLocalCart();
  if (!localItems.length) return;

  for (const item of localItems) {
    await upsertDbCartItem(userId, item.id, item.color, item.qty);
  }
  writeLocalCart([]); // guest cart is now merged in — clear it
}

// ---------- public API ----------

async function getItems() {
  const userId = await getCurrentUserId();
  return userId ? fetchDbCart(userId) : readLocalCart();
}

async function addItem(product, qty = 1) {
  const userId = await getCurrentUserId();
  const color = product.color || null;

  if (userId) {
    await upsertDbCartItem(userId, product.id, color, qty);
  } else {
    const items = readLocalCart();
    const existing = items.find((i) => i.id === product.id && (i.color || null) === color);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price,
        color,
        qty,
      });
    }
    writeLocalCart(items);
  }

  const items = await getItems();
  await updateCartBadge();
  notifyCartUpdated(items);
}

async function updateQty(id, color, qty) {
  const userId = await getCurrentUserId();

  if (userId) {
    const colorKey = color || "";
    if (qty <= 0) {
      await supabaseClient
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", id)
        .eq("color", colorKey);
    } else {
      await supabaseClient
        .from("cart_items")
        .update({ quantity: qty, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("product_id", id)
        .eq("color", colorKey);
    }
  } else {
    let items = readLocalCart();
    if (qty <= 0) {
      items = items.filter((i) => !(i.id === id && (i.color || null) === color));
    } else {
      const item = items.find((i) => i.id === id && (i.color || null) === color);
      if (item) item.qty = qty;
    }
    writeLocalCart(items);
  }

  const items = await getItems();
  await updateCartBadge();
  notifyCartUpdated(items);
}

async function removeItem(id, color) {
  await updateQty(id, color, 0);
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