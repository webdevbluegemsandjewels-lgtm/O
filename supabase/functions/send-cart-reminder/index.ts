// OrenkaFine — abandoned cart email reminder
// Deploy: supabase functions deploy send-cart-reminder
//
// Called hourly by the pg_cron job set up at the bottom of
// supabase/2026-09-10_cart_reminders.sql. Finds every
// public.cart_reminders row that's due (status = 'pending' and
// scheduled_at <= now()), groups them by shopper, sends ONE email per
// shopper listing everything they left behind, and flips those rows
// to 'sent' (or 'failed' if the send errors).
//
// Required Edge Function secrets:
//   RESEND_API_KEY              — from Resend
//   CART_REMINDER_FROM_EMAIL    — e.g. onboarding@resend.dev (must be
//                                 a Resend-verified sender/domain)
//   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
//   WEBHOOK_SECRET              — any random string you make up; must
//                                 match the "x-webhook-secret" header
//                                 the pg_cron job sends
//
// Also set SUPABASE_URL in the function environment, and turn OFF
// "Enforce JWT Verification" for this function (pg_cron calls it with
// the anon key, not a user session).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("CART_REMINDER_FROM_EMAIL") || "onboarding@resend.dev";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const SITE_URL = "https://orenkafine.com";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number) {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}

type ReminderRow = {
  id: string;
  user_email: string;
  user_name: string | null;
  product_name: string | null;
  product_image: string | null;
  color: string | null;
  selected_size: string | null;
  selected_metal_type: string | null;
  selected_diamond_quality: string | null;
  quantity: number;
  unit_price: number | null;
};

function itemLineHtml(row: ReminderRow) {
  const specs = [row.color, row.selected_metal_type, row.selected_size ? `Size ${row.selected_size}` : "", row.selected_diamond_quality]
    .filter(Boolean)
    .join(" · ");
  return `
    <tr>
      <td style="padding:10px 0; border-top:1px solid #e2d9c6;">
        <div style="font-size:14px; color:#16140f;">${escapeHtml(row.product_name || "Item")} &times; ${row.quantity}</div>
        ${specs ? `<div style="font-size:12px; color:#6b6355;">${escapeHtml(specs)}</div>` : ""}
      </td>
      <td style="padding:10px 0; border-top:1px solid #e2d9c6; text-align:right; font-size:14px; color:#16140f; white-space:nowrap;">
        ${row.unit_price != null ? money(row.unit_price * row.quantity) : ""}
      </td>
    </tr>
  `;
}

async function sendReminderEmail(userName: string | null, userEmail: string, rows: ReminderRow[]) {
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const itemsHtml = rows.map(itemLineHtml).join("");
  const firstName = (userName || "there").split(" ")[0];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: userEmail,
      subject: "You left something in your cart",
      html: `
        <div style="font-family: Georgia, serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#16140f;">
          <h1 style="font-size:20px; font-weight:500; margin-bottom:8px;">You left something behind, ${escapeHtml(firstName)}</h1>
          <p style="font-size:14px; line-height:1.7; color:#2a271f;">
            Your selected items are still waiting in your cart. Complete your order before they're gone.
          </p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            ${itemsHtml}
          </table>
          <p style="text-align:center; margin:24px 0;">
            <a href="${SITE_URL}/cart.html" style="background:#a9824c; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px; display:inline-block;">Complete your purchase</a>
          </p>
          <p style="font-size:13px; line-height:1.7; color:#6b6355;">
            Need help? Just reply to this email, or call/WhatsApp us at
            <a href="tel:+918655964188" style="color:#a9824c;">+91 86559 64188</a> — we're happy to assist.
          </p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Unable to send cart reminder email");
  return data;
}

serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const { data: due, error: selectError } = await admin
      .from("cart_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (selectError) return json({ error: selectError.message }, 500);
    if (!due || due.length === 0) return json({ ok: true, sent: 0 });

    // One email per shopper, listing everything of theirs that's due.
    const byUser = new Map<string, ReminderRow[]>();
    for (const row of due as ReminderRow[]) {
      const key = row.user_email;
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(row);
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const [userEmail, rows] of byUser) {
      const ids = rows.map((r) => r.id);
      try {
        await sendReminderEmail(rows[0].user_name, userEmail, rows);
        await admin
          .from("cart_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", ids);
        sentCount += ids.length;
      } catch (err) {
        console.error(`Failed to send cart reminder to ${userEmail}:`, err);
        await admin.from("cart_reminders").update({ status: "failed" }).in("id", ids);
        failedCount += ids.length;
      }
    }

    return json({ ok: true, sent: sentCount, failed: failedCount });
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
