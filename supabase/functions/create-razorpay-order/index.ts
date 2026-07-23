// OrenkaFine — create Razorpay order
//
// Deploy in Supabase Dashboard → Edge Functions (paste-and-deploy).
// Called directly from the browser (checkout.html), so:
//   - Leave "Enforce JWT Verification" ON (default) — checkout.html
//     sends the signed-in user's real access token, this is meant
//     to require a session, unlike welcome-email.
//
// Required Edge Function secrets (Settings → Secrets):
//   SUPABASE_URL              — auto-injected, no action needed
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected, no action needed
//   RAZORPAY_KEY_ID           — from the Razorpay dashboard (add later)
//   RAZORPAY_KEY_SECRET       — from the Razorpay dashboard (add later)
//
// Security note: price is computed here from the caller's own
// cart_items rows (unit_price, falling back to the live product
// price), never from anything the request body sends — so a
// tampered client request can't set its own order total.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return json({ error: "Razorpay isn't configured yet (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET secrets missing)" }, 500);
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const shipping = body.shipping || {};

    // Price/quantity come from the caller's real cart_items rows, not
    // the request body — see security note above.
    const { data: cartRows, error: cartErr } = await supabase
      .from("cart_items")
      .select("product_id, quantity, color, selected_size, selected_metal_type, selected_diamond_quality, unit_price, products(price)")
      .eq("user_id", userId);

    if (cartErr) return json({ error: cartErr.message }, 500);
    if (!cartRows || cartRows.length === 0) return json({ error: "Your cart is empty" }, 400);

    // unit_price is legitimately variable (karat/diamond/size adjustments
    // happen client-side in product.html), but cart_items is writable via
    // the anon key — a request crafted directly against the REST API
    // could set an arbitrary (even negative) unit_price on a real
    // product_id. Floor it against the real product price so a tampered
    // row can't check out for a fraction of, or less than, nothing.
    const MIN_PRICE_RATIO = 0.5;
    const orderItems = cartRows.map((row: any) => {
      const basePrice = Number(row.products?.price) || 0;
      const claimedPrice = row.unit_price != null ? Number(row.unit_price) : basePrice;
      const price = claimedPrice > 0 && claimedPrice >= basePrice * MIN_PRICE_RATIO ? claimedPrice : basePrice;
      return {
        product_id: row.product_id,
        quantity: row.quantity,
        price,
        color: row.color,
        selected_size: row.selected_size,
        selected_metal_type: row.selected_metal_type,
        selected_diamond_quality: row.selected_diamond_quality,
      };
    });

    const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (!(total > 0)) return json({ error: "Order total must be greater than zero" }, 400);

    // Razorpay amount is in the smallest currency unit (paise for INR).
    const amountPaise = Math.round(total * 100);

    const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `orenkafine_${Date.now()}`,
      }),
    });
    const rzData = await rzRes.json();
    if (!rzRes.ok) {
      console.error("Razorpay order creation failed:", rzData);
      return json({ error: rzData?.error?.description || "Could not create Razorpay order" }, 502);
    }

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "pending",
        total,
        currency: "INR",
        razorpay_order_id: rzData.id,
        shipping_name: shipping.name || null,
        shipping_phone: shipping.phone || null,
        shipping_address: shipping.address || null,
        shipping_city: shipping.city || null,
        shipping_state: shipping.state || null,
        shipping_pincode: shipping.pincode || null,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow) return json({ error: orderErr?.message || "Could not create order" }, 500);

    const { error: itemsErr } = await supabase.from("order_items").insert(
      orderItems.map((i) => ({
        order_id: orderRow.id,
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
        color: i.color,
        selected_size: i.selected_size,
        selected_metal_type: i.selected_metal_type,
        selected_diamond_quality: i.selected_diamond_quality,
      }))
    );

    if (itemsErr) {
      // Order header exists but items failed — mark it failed rather
      // than leave a priced order with nothing in it.
      await supabase.from("orders").update({ status: "failed" }).eq("id", orderRow.id);
      return json({ error: itemsErr.message }, 500);
    }

    return json({
      key_id: RAZORPAY_KEY_ID,
      amount: amountPaise,
      currency: "INR",
      razorpay_order_id: rzData.id,
      order_id: orderRow.id,
    });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
