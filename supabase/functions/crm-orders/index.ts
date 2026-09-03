// OrenkaFine — CRM dashboard data endpoint
// Deploy: supabase functions deploy crm-orders
//
// Returns every order (women's + men's items, shipping/customer details,
// payment status) for the internal CRM dashboard at crm-dashboard.html,
// and lets staff update an order's status/remark or delete an order.
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
//
// Requires supabase/2026-09-03_orders_admin_notes.sql to have been run
// (adds orders.admin_notes, used by the "update" action's remark field),
// and supabase/2026-09-03_crm_order_views.sql (adds
// public.crm_order_views, used by the "mark_viewed" action / the
// "viewed" field on each listed order).
//
// Request body: { username, password, action?, order_id?, status?, admin_notes? }
//   action "list" (default) — returns { orders: [...] }, each with a
//                              "viewed" boolean from crm_order_views
//   action "update"         — updates status and/or admin_notes on order_id
//   action "delete"         — deletes order_id (and its order_items rows)
//   action "mark_viewed"    — marks order_id as viewed (row click or a
//                              download counts as viewing it)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_USER = Deno.env.get("ADMIN") || "";
const ADMIN_PASSWORD = Deno.env.get("AD_PASSWORD") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VALID_STATUSES = ["pending", "paid", "failed", "cancelled"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function listOrders() {
  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (ordersErr) return json({ error: ordersErr.message }, 500);

  const orderIds = (orders || []).map((o) => o.id);

  const { data: views } = await admin
    .from("crm_order_views")
    .select("order_id, viewed")
    .in("order_id", orderIds);
  const viewedSet = new Set((views || []).filter((v) => v.viewed).map((v) => v.order_id));

  const [{ data: womensItems }, { data: mensItems }] = await Promise.all([
    admin
      .from("order_items")
      .select("order_id, quantity, price, color, selected_size, selected_metal_type, selected_diamond_quality, products(name, image, category, gold_weight_grams, diamond_weight_ct, product_code)")
      .in("order_id", orderIds),
    admin
      .from("mens_order_items")
      .select("order_id, quantity, price, color, selected_size, selected_metal_type, selected_diamond_quality, mens_products(name, image, category, gold_weight_grams, product_code)")
      .in("order_id", orderIds),
  ]);

  const allItems = (womensItems || []).concat(
    (mensItems || []).map((row: Record<string, unknown>) => ({ ...row, products: row.mens_products }))
  );

  const itemsByOrder: Record<string, unknown[]> = {};
  allItems.forEach((item: Record<string, unknown>) => {
    const key = item.order_id as string;
    const product = (item.products as Record<string, unknown>) || {};
    (itemsByOrder[key] = itemsByOrder[key] || []).push({
      name: product.name || "Product",
      image: product.image || "",
      category: product.category || "",
      product_code: product.product_code || "",
      gold_weight_grams: product.gold_weight_grams ?? null,
      diamond_weight_ct: product.diamond_weight_ct ?? null,
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
    admin_notes: o.admin_notes || "",
    viewed: viewedSet.has(o.id),
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
}

async function updateOrder(orderId: string, status: unknown, adminNotes: unknown) {
  if (!orderId) return json({ error: "order_id is required" }, 400);

  const updates: Record<string, unknown> = {};
  if (typeof status === "string" && status) {
    if (!VALID_STATUSES.includes(status)) return json({ error: "Invalid status" }, 400);
    updates.status = status;
  }
  if (typeof adminNotes === "string") {
    updates.admin_notes = adminNotes;
  }
  if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);

  const { error } = await admin.from("orders").update(updates).eq("id", orderId);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
}

async function markViewed(orderId: string, username: string) {
  if (!orderId) return json({ error: "order_id is required" }, 400);

  const { data: existing } = await admin
    .from("crm_order_views")
    .select("view_count")
    .eq("order_id", orderId)
    .maybeSingle();

  const { error } = await admin.from("crm_order_views").upsert({
    order_id: orderId,
    viewed: true,
    viewed_by: username,
    viewed_at: new Date().toISOString(),
    view_count: (existing?.view_count || 0) + 1,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
}

async function deleteOrder(orderId: string) {
  if (!orderId) return json({ error: "order_id is required" }, 400);

  await admin.from("order_items").delete().eq("order_id", orderId);
  await admin.from("mens_order_items").delete().eq("order_id", orderId);
  const { error } = await admin.from("orders").delete().eq("id", orderId);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
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

    const action = typeof body?.action === "string" ? body.action : "list";

    if (action === "update") {
      return await updateOrder(body?.order_id, body?.status, body?.admin_notes);
    }
    if (action === "delete") {
      return await deleteOrder(body?.order_id);
    }
    if (action === "mark_viewed") {
      return await markViewed(body?.order_id, username);
    }
    return await listOrders();
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
