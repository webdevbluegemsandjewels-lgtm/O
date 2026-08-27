// OrenkaFine — live gold rate updater
//
// NOT DEPLOYED / NOT SCHEDULED YET. This is prepared for later —
// right now public.gold_rates.rate_24kt_per_10g is just a manually
// looked-up snapshot set by supabase_schema.sql. This function is
// the code for making that live; wiring it up is a separate step:
//
//   1. Deploy it: supabase functions deploy update-gold-rate
//      (or Supabase Dashboard → Edge Functions → deploy from this file).
//   2. Schedule it hourly: Supabase Dashboard → Database → Cron Jobs
//      → New cron job → run every hour → HTTP request to this
//      function's URL (Authorization: Bearer <anon or service key>).
//      Or, from SQL Editor, pg_cron + pg_net:
//        select cron.schedule('update-gold-rate-hourly', '0 * * * *', $$
//          select net.http_post(
//            url := 'https://<project-ref>.supabase.co/functions/v1/update-gold-rate',
//            headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//          );
//        $$);
//
// Gold spot price source: https://api.gold-api.com/price/XAU — a
// free, no-API-key endpoint, verified working. Returns USD per
// troy ounce for XAU (gold).
//
// USD→INR source: https://api.frankfurter.app/latest?from=USD&to=INR
// — free, no key, ECB reference rates (updated on ECB business days,
// not literally every hour, but live and no longer a hardcoded guess).
// Falls back to FALLBACK_USD_INR_RATE only if that request fails.
//
// Required Edge Function secrets when you do deploy this:
//   SUPABASE_URL              — auto-injected by Supabase, no action needed
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase, no action needed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Used only if the live frankfurter.app lookup below fails.
const FALLBACK_USD_INR_RATE = 88;

const GRAMS_PER_TROY_OUNCE = 31.1034768;

async function getUsdInrRate(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR");
    if (!res.ok) return FALLBACK_USD_INR_RATE;
    const data = await res.json();
    const rate = Number(data?.rates?.INR);
    return rate || FALLBACK_USD_INR_RATE;
  } catch {
    return FALLBACK_USD_INR_RATE;
  }
}

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

    const usdInrRate = await getUsdInrRate();
    const usdPerGram = usdPerOunce / GRAMS_PER_TROY_OUNCE;
    const inrPerGram = usdPerGram * usdInrRate;
    const inrPer10g = inrPerGram * 10;

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase
      .from("gold_rates")
      .upsert({ id: 1, rate_24kt_per_10g: inrPer10g, updated_at: new Date().toISOString() });

    if (error) {
      console.error("Failed to update gold_rates:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ updated: true, usd_per_ounce: usdPerOunce, usd_inr_rate: usdInrRate, rate_24kt_per_10g: inrPer10g }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
