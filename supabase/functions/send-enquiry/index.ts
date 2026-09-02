// OrenkaFine — contact form enquiry handler
// Deploy: supabase functions deploy send-enquiry
//
// Saves every contact.html submission to public.enquiries, then emails
// info@orenkafine.com with the details (reply-to set to the visitor's
// own email, so replying goes straight back to them).
//
// Required Edge Function secrets:
//   RESEND_API_KEY              — from Resend
//   ENQUIRY_FROM_EMAIL          — e.g. onboarding@resend.dev (must be a
//                                 Resend-verified sender/domain)
//   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
//
// Also set SUPABASE_URL in the function environment.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("ENQUIRY_FROM_EMAIL") || "onboarding@resend.dev";
const ENQUIRY_TO_EMAIL = "info@orenkafine.com";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEnquiryEmail(enquiry: {
  firstName: string;
  lastName: string;
  email: string;
  topic: string;
  message: string;
}) {
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ENQUIRY_TO_EMAIL,
      reply_to: enquiry.email,
      subject: `New enquiry — ${enquiry.topic}`,
      html: `
        <div style="font-family: Georgia, serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#16140f;">
          <h1 style="font-size:20px; font-weight:500; margin-bottom:16px;">New website enquiry</h1>
          <p style="font-size:14px; line-height:1.7; color:#2a271f;">
            <strong>Name:</strong> ${escapeHtml(enquiry.firstName)} ${escapeHtml(enquiry.lastName)}<br/>
            <strong>Email:</strong> ${escapeHtml(enquiry.email)}<br/>
            <strong>Topic:</strong> ${escapeHtml(enquiry.topic)}
          </p>
          <p style="font-size:14px; line-height:1.7; color:#2a271f; white-space:pre-wrap;">${escapeHtml(enquiry.message)}</p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Unable to send enquiry email");
  return data;
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

  try {
    const body = await req.json();
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "General question";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!firstName || !lastName || !email || !message) {
      return json({ error: "First name, last name, email, and message are required" }, 400);
    }

    const { error: insertError } = await admin.from("enquiries").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      topic,
      message,
    });

    if (insertError) {
      return json({ error: insertError.message }, 500);
    }

    try {
      await sendEnquiryEmail({ firstName, lastName, email, topic, message });
    } catch (emailError) {
      // The enquiry is already saved in the database at this point —
      // don't fail the whole request just because the notification
      // email couldn't be sent (e.g. Resend not configured yet).
      console.error("Failed to send enquiry email:", emailError);
      return json({ ok: true, saved: true, emailed: false });
    }

    return json({ ok: true, saved: true, emailed: true });
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
