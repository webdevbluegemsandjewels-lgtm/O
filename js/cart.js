/* =========================================================
   OrenkaFine — client-side cart (localStorage)
   Real order/payment writes happen server-side later via
   the Razorpay Edge Function; this just tracks the bag
   the user is building before checkout.
   ========================================================= */

const OrenkaFine_CART_KEY = "OrenkaFine_cart_v1";

function readCart() {
  try {
    const raw = localStorage.getItem(OrenkaFine_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Cart read error:", e);
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(OrenkaFine_CART_KEY, JSON.stringify(items));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent("OrenkaFine:cart-updated", { detail: { items } }));
}

function updateCartBadge() {
  const count = readCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count > 0 ? String(count) : "";
    el.style.display = count > 0 ? "inline-flex" : "none";
  });
}

function addItem(product, qty = 1) {
  const items = readCart();
  const existing = items.find(
    (i) => i.id === product.id && i.color === (product.color || null)
  );
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      color: product.color || null,
      qty,
    });
  }
  writeCart(items);
}

function updateQty(id, color, qty) {
  let items = readCart();
  if (qty <= 0) {
    items = items.filter((i) => !(i.id === id && i.color === color));
  } else {
    const item = items.find((i) => i.id === id && i.color === color);
    if (item) item.qty = qty;
  }
  writeCart(items);
}

function removeItem(id, color) {
  updateQty(id, color, 0);
}

function clearCart() {
  writeCart([]);
}

function getSubtotal() {
  return readCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

window.OrenkaFineCart = {
  getItems: readCart,
  addItem,
  updateQty,
  removeItem,
  clearCart,
  getSubtotal,
};

document.addEventListener("DOMContentLoaded", updateCartBadge);