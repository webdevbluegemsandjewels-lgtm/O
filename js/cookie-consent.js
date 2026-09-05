/* =========================================================
   OrenkaFine — cookie consent banner
   Shows once per browser (until Accept/Reject is clicked, tracked in
   localStorage so it doesn't nag on every page load) and records the
   choice in public.cookie_consents — user_id + name when the visitor
   is logged in (getCurrentUser(), from js/auth.js), both null for an
   anonymous visitor, since browsing stays open to everyone on this
   site (see js/auth.js's header comment).
   ========================================================= */

const COOKIE_CONSENT_KEY = "orenka_cookie_consent"; // "accepted" | "rejected"

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem(COOKIE_CONSENT_KEY)) return;
  if (document.getElementById("cookieConsentBanner")) return;

  const banner = document.createElement("div");
  banner.id = "cookieConsentBanner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie consent");
  banner.style.cssText = `
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 1200;
    background: #16140f; color: #f5f2ea;
    padding: 1rem 1.2rem; display: flex; align-items: center;
    justify-content: center; gap: 1rem; flex-wrap: wrap;
    font-family: var(--font-body, 'Inter', sans-serif); font-size: .88rem;
    box-shadow: 0 -8px 30px rgba(0,0,0,.18);
  `;
  banner.innerHTML = `
    <p style="margin:0; max-width:640px; line-height:1.6;">
      We use cookies to keep your cart and account working smoothly and to understand how the site is used.
      <a href="contact.html" style="color:#e9c88b; text-decoration:underline;">Learn more</a>
    </p>
    <div style="display:flex; gap:.6rem; flex-shrink:0;">
      <button type="button" id="cookieRejectBtn" style="background:none; border:1px solid rgba(245,242,234,.4); color:#f5f2ea; border-radius:8px; padding:.55rem 1.1rem; font-size:.85rem; cursor:pointer;">Reject</button>
      <button type="button" id="cookieAcceptBtn" style="background:#a9824c; border:1px solid #a9824c; color:#fff; border-radius:8px; padding:.55rem 1.1rem; font-size:.85rem; font-weight:600; cursor:pointer;">Accept</button>
    </div>
  `;
  document.body.appendChild(banner);

  async function recordConsent(accepted) {
    localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? "accepted" : "rejected");
    banner.remove();

    try {
      let userId = null;
      let name = null;
      if (typeof getCurrentUser === "function") {
        const user = await getCurrentUser();
        if (user) {
          userId = user.id;
          name = (user.user_metadata && user.user_metadata.full_name) || user.email || null;
        }
      }
      if (typeof supabaseClient !== "undefined") {
        await supabaseClient.from("cookie_consents").insert({ user_id: userId, name, accepted });
      }
    } catch (err) {
      // Never block browsing on a logging failure — the choice is
      // already saved locally either way.
      console.error("Could not record cookie consent:", err.message || err);
    }
  }

  document.getElementById("cookieAcceptBtn").addEventListener("click", () => recordConsent(true));
  document.getElementById("cookieRejectBtn").addEventListener("click", () => recordConsent(false));
});
