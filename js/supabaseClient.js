/* =========================================================
   OrenkaFine — Supabase browser client
   Fill in your real values from Supabase Dashboard → Settings → API
   The anon/public key is safe to expose in frontend code.
   NEVER put the service_role key here.
   ========================================================= */


// supabase-js is loaded globally via the CDN <script> tag in each HTML page
// (see the script tag added before this file: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
