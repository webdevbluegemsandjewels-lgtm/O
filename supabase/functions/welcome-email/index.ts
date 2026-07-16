// OrenkaFine — welcome email
// Deploy this in Supabase Dashboard → Edge Functions (paste-and-deploy,
// no CLI needed). Triggered by a Database Webhook on INSERT into
// public.profiles (fires right after someone signs up).
//
// Required Edge Function secrets (set in the function's Settings):
//   RESEND_API_KEY     — from resend.com dashboard
//   WELCOME_FROM_EMAIL — e.g. "onboarding@resend.dev" until you verify
//                        your own domain in Resend, then swap to
//                        something like "hello@orenkafine.com"
//   WEBHOOK_SECRET      — any random string you make up; must match
//                         the "x-webhook-secret" header set on the
//                         Database Webhook that calls this function
//
// Also turn OFF "Enforce JWT Verification" for this function, since
// the Database Webhook calls it without a user session.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("WELCOME_FROM_EMAIL") || "onboarding@resend.dev";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  try {
    const payload = await req.json();
    const record = payload.record ?? {};
    const email = record.email;
    const fullName = record.full_name || "there";

    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no email on record" }), { status: 200 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "Welcome to OrenkaFine",
        html: `
          <div style="font-family: Georgia, serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#16140f;">
            <h1 style="font-size:22px; font-weight:500; margin-bottom:4px;">Welcome to OrenkaFine, ${fullName}.</h1>
            <p style="font-size:15px; line-height:1.6; color:#2a271f;">
              We're so glad you're here. OrenkaFine is a house of fine and everyday jewelry —
              rings, necklaces, earrings and bracelets designed to be worn often, not saved
              for someday.
            </p>
            <p style="font-size:15px; line-height:1.6; color:#2a271f;">
              Your account is ready. Browse the collection, save what catches your eye, and
              when you're ready, checkout takes under a minute.
            </p>
            <p style="font-size:15px; line-height:1.6; margin-top:24px;">
              Warmly,<br/>The OrenkaFine team
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ sent: true, id: data.id }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
