// OrenkaFine — live gold rate updater
//
// Deployed. Not yet scheduled — see step 2 below.
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
// Rate source: Arihant Spot's live bullion ticker —
//   https://bcast.arihantspot.in/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/arihant
// Public, no API key. Found by reading arihantspot.in/LiveRates.html's
// client-side config (js/LiveRates3.js), not a documented/versioned
// API — its shape or availability could change without notice, which
// is why a bad/missing response below skips the DB write entirely
// rather than storing a garbage rate.
//
// Response is plain text, one row per line, tab-separated, with a
// leading tab before the id (so splitting on "\t" gives an empty
// first field):
//   "" \t id \t name \t bid \t price \t high \t low
// We pull the "GOLD 999 WITH GST" row's price column, e.g.:
//   	2728	GOLD 999 WITH GST 	-	163103	168070	161213
// That price is already a ₹-per-10-gram figure (matches
// gold_rates.rate_24kt_per_10g directly) — stored as-is below, no
// conversion needed.
//
// GST note: this feed value already has GST baked in by the
// exchange, and calculate_product_price() *also* adds its own 3% GST
// on top of gold+diamond+making. That double GST layer is
// deliberate — an explicit choice made when wiring this up, not a
// bug to "fix" by switching to a non-GST row or touching
// calculate_product_price().
//
// Required Edge Function secrets:
//   SUPABASE_URL              — auto-injected by Supabase, no action needed
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase, no action needed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const RATE_FEED_URL = "https://bcast.arihantspot.in/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/arihant";
const TARGET_ROW_NAME = "GOLD 999 WITH GST";

// Returns the feed's raw price, already ₹ per 10g — matches the
// gold_rates.rate_24kt_per_10g convention directly.
function parseRatePerTenGrams(feedText: string): number | null {
  const lines = feedText.split("\n");
  for (const line of lines) {
    const cols = line.split("\t").map((c) => c.trim());
    // "" (leading tab), id, name, bid, price, high, low
    if (cols.length < 5) continue;
    if (cols[2] !== TARGET_ROW_NAME) continue;
    const price = Number(cols[4]);
    return Number.isFinite(price) && price > 0 ? price : null;
  }
  return null;
}

serve(async () => {
  try {
    const feedRes = await fetch(RATE_FEED_URL);
    if (!feedRes.ok) {
      const text = await feedRes.text();
      return new Response(JSON.stringify({ error: "Arihant Spot feed request failed", detail: text }), { status: 502 });
    }
    const feedText = await feedRes.text();
    const rate24ktPer10g = parseRatePerTenGrams(feedText);

    if (rate24ktPer10g === null) {
      return new Response(
        JSON.stringify({ error: `"${TARGET_ROW_NAME}" row not found or unparsable in feed`, raw: feedText }),
        { status: 502 }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase
      .from("gold_rates")
      .upsert({ id: 1, rate_24kt_per_10g: rate24ktPer10g, updated_at: new Date().toISOString() });

    if (error) {
      console.error("Failed to update gold_rates:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        updated: true,
        source_row: TARGET_ROW_NAME,
        rate_24kt_per_10g: rate24ktPer10g,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
