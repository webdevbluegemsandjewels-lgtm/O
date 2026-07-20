/* =========================================================
   OrenkaFine — Supabase browser client
   Fill in your real values from Supabase Dashboard → Settings → API
   The anon/public key is safe to expose in frontend code.
   NEVER put the service_role key here.
   ========================================================= */

const SUPABASE_URL = "https://xjepiecjsomrallliifj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXBpZWNqc29tcmFsbGxpaWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODgyMDEsImV4cCI6MjA5OTY2NDIwMX0.cSYAd2dJcYOUvnGc66wjWtjVcww12p2rhHetZwzRoms";

// supabase-js is loaded globally via the CDN <script> tag in each HTML page
// (see the script tag added before this file: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
