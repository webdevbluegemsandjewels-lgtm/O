// OrenkaFine — verify Razorpay payment
//
// Deploy in Supabase Dashboard → Edge Functions (paste-and-deploy).
// Called directly from the browser (checkout.html) after Razorpay
// Checkout completes, so:
//   - Leave "Enforce JWT Verification" ON (default).
//
// Required Edge Function secrets (Settings → Secrets):
//   SUPABASE_URL              — auto-injected, no action needed
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected, no action needed
//   RAZORPAY_KEY_SECRET       — same value as on create-razorpay-order
//
// Verifies the HMAC-SHA256 signature Razorpay returns (the only real
// proof a payment succeeded — everything else in the callback is
// just data the browser could fabricate), confirms the order
// actually belongs to the caller, then marks it paid.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ verified: false, error: "Method not allowed" }, 405);

  try {
    if (!RAZORPAY_KEY_SECRET) {
      return json({ verified: false, error: "Razorpay isn't configured yet (RAZORPAY_KEY_SECRET secret missing)" }, 500);
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ verified: false, error: "Missing auth" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ verified: false, error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ verified: false, error: "Missing fields" }, 400);
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, razorpay_order_id, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return json({ verified: false, error: "Order not found" }, 404);
    if (order.user_id !== userId) return json({ verified: false, error: "This order doesn't belong to you" }, 403);
    if (order.razorpay_order_id !== razorpay_order_id) return json({ verified: false, error: "Order mismatch" }, 400);

    if (order.status === "paid") {
      // Already verified earlier (e.g. a retried request) — treat as success.
      return json({ verified: true, order_id });
    }

    const expectedSignature = await hmacSha256Hex(RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expectedSignature !== razorpay_signature) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order_id);
      return json({ verified: false, error: "Signature verification failed" }, 400);
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: "paid", razorpay_payment_id, paid_at: new Date().toISOString() })
      .eq("id", order_id);

    if (updateErr) return json({ verified: false, error: updateErr.message }, 500);

    return json({ verified: true, order_id });
  } catch (err) {
    console.error(err);
    return json({ verified: false, error: String(err) }, 500);
  }
});
