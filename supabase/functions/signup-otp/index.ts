// OrenkaFine — signup OTP email function
// Deploy this in Supabase Dashboard → Edge Functions.
// It sends a 6-digit verification code for signup and verifies it
// against the short-lived public.signup_otp_codes table.
//
// Required Edge Function secrets:
//   RESEND_API_KEY              — from Resend
//   OTP_FROM_EMAIL              — e.g. onboarding@resend.dev
//   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
//   OTP_SECRET                  — any long random string
//
// Also set SUPABASE_URL in the function environment.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("OTP_FROM_EMAIL") || "onboarding@resend.dev";
const OTP_SECRET = Deno.env.get("OTP_SECRET") || "replace-with-a-long-random-secret";
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function generateCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, "0");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendOtpEmail(email: string, code: string) {
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Your OrenkaFine verification code",
      html: `
        <div style="font-family: Georgia, serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#16140f;">
          <h1 style="font-size:22px; font-weight:500; margin-bottom:8px;">Verify your OrenkaFine account</h1>
          <p style="font-size:15px; line-height:1.6; color:#2a271f;">Use this 6-digit code to finish signing up:</p>
          <div style="font-size:32px; letter-spacing:8px; font-weight:700; margin:24px 0; color:#a9824c;">${code}</div>
          <p style="font-size:13px; line-height:1.6; color:#6f6658;">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Unable to send OTP email");
  return data;
}

serve(async (req) => {
  try {
    const body = await req.json();
    const action = body?.action;
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return json({ error: "Email is required" }, 400);
    }

    if (action === "send") {
      const code = generateCode();
      const codeHash = await sha256Hex(`${email}:${code}:${OTP_SECRET}`);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

      const { error } = await admin.from("signup_otp_codes").upsert({
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
      });

      if (error) return json({ error: error.message }, 500);

      await sendOtpEmail(email, code);
      return json({ ok: true, message: "OTP sent" });
    }

    if (action === "verify") {
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      if (!code) return json({ error: "OTP code is required" }, 400);

      const { data, error } = await admin
        .from("signup_otp_codes")
        .select("email, code_hash, expires_at, attempts")
        .eq("email", email)
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "No OTP found. Please request a new code." }, 400);
      if (new Date(data.expires_at).getTime() < Date.now()) {
        await admin.from("signup_otp_codes").delete().eq("email", email);
        return json({ error: "OTP expired. Please request a new code." }, 400);
      }

      const codeHash = await sha256Hex(`${email}:${code}:${OTP_SECRET}`);
      if (codeHash !== data.code_hash) {
        const attempts = (data.attempts || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await admin.from("signup_otp_codes").delete().eq("email", email);
          return json({ error: "Too many attempts. Please request a new code." }, 400);
        }

        await admin.from("signup_otp_codes").update({ attempts }).eq("email", email);
        return json({ error: "Invalid OTP code" }, 400);
      }

      await admin.from("signup_otp_codes").delete().eq("email", email);
      return json({ ok: true, verified: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
