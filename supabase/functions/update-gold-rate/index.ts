// OrenkaFine — live gold rate updater
//
// NOT DEPLOYED / NOT SCHEDULED YET. This is prepared for later —
// right now public.gold_rates.rate_24kt_per_gram is just a manually
// looked-up snapshot set by supabase_schema.sql. This function is
// the code for making that live; wiring it up is a separate step:
//
//   1. Deploy it (Supabase Dashboard → Edge Functions, or CLI).
//   2. Set a real USD_INR_RATE secret (or replace the conversion
//      below with a real forex API call — deliberately left as a
//      flat rate for now since a forex source hasn't been chosen).
//   3. Schedule it (Supabase → Database → Cron Jobs, e.g. hourly)
//      calling this function's URL, or trigger it manually.
//
// Gold spot price source: https://api.gold-api.com/price/XAU — a
// free, no-API-key endpoint, verified working. Returns USD per
// troy ounce for XAU (gold). No key/signup needed, so nothing to
// configure for that part.
//
// Required Edge Function secrets when you do deploy this:
//   SUPABASE_URL              — auto-injected by Supabase, no action needed
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase, no action needed
//   USD_INR_RATE               — optional; without it, falls back to the
//                                 hardcoded approximate rate below

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Approximate fallback only — replace with a real live USD→INR feed
// (e.g. exchangerate-api.com, frankfurter.app) before relying on
// this for real pricing. Update by hand in the meantime if it drifts.
const FALLBACK_USD_INR_RATE = 88;
const USD_INR_RATE = Number(Deno.env.get("USD_INR_RATE")) || FALLBACK_USD_INR_RATE;

const GRAMS_PER_TROY_OUNCE = 31.1034768;

serve(async () => {
  try {
    const goldRes = await fetch("https://api.gold-api.com/price/XAU");
    if (!goldRes.ok) {
      const text = await goldRes.text();
      return new Response(JSON.stringify({ error: "gold-api.com request failed", detail: text }), { status: 502 });
    }
    const goldData = await goldRes.json();
    const usdPerOunce = Number(goldData.price);
    if (!usdPerOunce) {
      return new Response(JSON.stringify({ error: "gold-api.com returned no usable price", raw: goldData }), { status: 502 });
    }

    const usdPerGram = usdPerOunce / GRAMS_PER_TROY_OUNCE;
    const inrPerGram = usdPerGram * USD_INR_RATE;

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase
      .from("gold_rates")
      .upsert({ id: 1, rate_24kt_per_gram: inrPerGram, updated_at: new Date().toISOString() });

    if (error) {
      console.error("Failed to update gold_rates:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ updated: true, usd_per_ounce: usdPerOunce, usd_inr_rate: USD_INR_RATE, rate_24kt_per_gram: inrPerGram }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
