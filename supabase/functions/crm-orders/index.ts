// OrenkaFine — CRM dashboard data endpoint
// Deploy: supabase functions deploy crm-orders
//
// Returns every order (women's + men's items, shipping/customer details,
// payment status) for the internal CRM dashboard at crm-dashboard.html.
// Gated by a shared admin name/password checked against Edge Function
// secrets — NOT a Supabase auth session, since this dashboard has no
// per-staff accounts. Set the secrets with:
//   supabase secrets set ADMIN=xyz AD_PASSWORD=123456
//
// Required Edge Function secrets:
//   ADMIN                        — admin username
//   AD_PASSWORD                  — admin password
//   SUPABASE_SERVICE_ROLE_KEY    — Supabase service role key
//   SUPABASE_URL                 — project URL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_USER = Deno.env.get("ADMIN") || "";
const ADMIN_PASSWORD = Deno.env.get("AD_PASSWORD") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return json({ error: "CRM login is not configured yet" }, 500);
  }

  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return json({ error: "Invalid name or password" }, 401);
    }

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (ordersErr) return json({ error: ordersErr.message }, 500);

    const orderIds = (orders || []).map((o) => o.id);

    const [{ data: womensItems }, { data: mensItems }] = await Promise.all([
      admin
        .from("order_items")
        .select("order_id, quantity, price, color, selected_size, selected_metal_type, selected_diamond_quality, products(name, image, category)")
        .in("order_id", orderIds),
      admin
        .from("mens_order_items")
        .select("order_id, quantity, price, color, selected_size, selected_metal_type, selected_diamond_quality, mens_products(name, image, category)")
        .in("order_id", orderIds),
    ]);

    const allItems = (womensItems || []).concat(
      (mensItems || []).map((row: Record<string, unknown>) => ({ ...row, products: row.mens_products }))
    );

    const itemsByOrder: Record<string, unknown[]> = {};
    allItems.forEach((item: Record<string, unknown>) => {
      const key = item.order_id as string;
      (itemsByOrder[key] = itemsByOrder[key] || []).push({
        name: (item.products as Record<string, unknown>)?.name || "Product",
        image: (item.products as Record<string, unknown>)?.image || "",
        category: (item.products as Record<string, unknown>)?.category || "",
        color: item.color || "",
        metal_type: item.selected_metal_type || "",
        diamond_quality: item.selected_diamond_quality || "",
        size: item.selected_size || "",
        quantity: item.quantity,
        unit_price: item.price,
      });
    });

    const result = (orders || []).map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      total: o.total,
      razorpay_order_id: o.razorpay_order_id,
      razorpay_payment_id: o.razorpay_payment_id,
      customer: {
        name: o.shipping_name || "",
        phone: o.shipping_phone || "",
        address: o.shipping_address || "",
        city: o.shipping_city || "",
        state: o.shipping_state || "",
        pincode: o.shipping_pincode || "",
      },
      items: itemsByOrder[o.id] || [],
    }));

    return json({ orders: result });
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
