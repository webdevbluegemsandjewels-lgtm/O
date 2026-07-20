/* =========================================================
   MIRWA — auth helpers (Supabase Auth)
   Browsing stays open to everyone. Only specific actions
   (writing a review, placing an order) call requireAuth().
   ========================================================= */

/**
 * Minimal MD5 (public-domain algorithm, standard JS port) — used only
 * to build Gravatar URLs from an email address. Gravatar's API
 * requires an MD5 hash of the trimmed, lowercased email.
 */
function md5Hex(str) {
  function rotl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function add32(a, b) { return (a + b) & 0xffffffff; }
  function toHex(n) {
    let s = "";
    for (let i = 0; i < 4; i++) s += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    return s;
  }
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
             5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
             6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];

  const bytes = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((bitLen / 2 ** (8 * i)) & 0xff);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
    const M = [];
    for (let j = 0; j < 16; j++) {
      M[j] = bytes[chunkStart + j * 4] | (bytes[chunkStart + j * 4 + 1] << 8) |
             (bytes[chunkStart + j * 4 + 2] << 16) | (bytes[chunkStart + j * 4 + 3] << 24);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = add32(add32(add32(F, A), K[i]), M[g]);
      A = D; D = C; C = B;
      B = add32(B, rotl(F, S[i]));
    }
    a0 = add32(a0, A); b0 = add32(b0, B); c0 = add32(c0, C); d0 = add32(d0, D);
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Session check failed:", error.message);
    return null;
  }
  return data.session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session ? session.user : null;
}

/**
 * Call this before a gated action (write review, place order).
 * Opens the login/signup popup if not logged in. Resolves with
 * the user on success, or null if the person cancels the popup.
 */
async function requireAuth() {
  const user = await getCurrentUser();
  if (user) return user;

  const result = await window.openAuthModal("login");
  return result || null;
}

async function logout() {
  await supabaseClient.auth.signOut();
  await syncAccountUI();
  window.location.reload();
}

const ACCOUNT_ICON_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

/**
 * Renders an avatar into the header account icon: the person's
 * Gravatar photo if their email has one set up, otherwise a circle
 * with their initial letter.
 */
/**
 * Renders an avatar into the header account icon, in priority order:
 * 1. The photo from an OAuth provider (e.g. Google), if they signed in that way
 * 2. Gravatar, if their email has one set up
 * 3. A circle with their initial letter
 */
function renderAccountAvatar(el, user) {
  const fullName = user.user_metadata && user.user_metadata.full_name;
  const email = user.email || "";
  const letter = (fullName || email || "?").trim().charAt(0).toUpperCase() || "?";
  const oauthPhoto = user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture);

  const fallback = document.createElement("div");
  fallback.className = "account-avatar account-avatar-initial";
  fallback.textContent = letter;

  el.innerHTML = "";

  function tryGravatar() {
    if (email && typeof md5Hex === "function") {
      const hash = md5Hex(email.trim().toLowerCase());
      const img = document.createElement("img");
      img.className = "account-avatar account-avatar-img";
      img.alt = "";
      img.src = `https://www.gravatar.com/avatar/${hash}?d=404&s=64`;
      img.onerror = () => { if (img.isConnected) img.replaceWith(fallback); };
      el.appendChild(img);
    } else {
      el.appendChild(fallback);
    }
  }

  if (oauthPhoto) {
    const img = document.createElement("img");
    img.className = "account-avatar account-avatar-img";
    img.alt = "";
    img.referrerPolicy = "no-referrer"; // Google's photo URLs can block hotlinking without this
    img.src = oauthPhoto;
    img.onerror = () => {
      if (img.isConnected) {
        img.remove();
        tryGravatar();
      }
    };
    el.appendChild(img);
  } else {
    tryGravatar();
  }
}

/**
 * Updates the header account icon/link to reflect session state.
 * Looks for an element with [data-account-link]. If logged in, it
 * shows the person's avatar and links to account.html; otherwise it
 * opens the login/signup popup (falls back to login.html if JS/the
 * modal fails to load).
 */
async function syncAccountUI() {
  const el = document.querySelector("[data-account-link]");
  if (!el) return;

  const user = await getCurrentUser();
  if (user) {
    el.setAttribute("href", "account.html");
    el.setAttribute("aria-label", "Your account");
    el.title = (user.user_metadata && user.user_metadata.full_name) || user.email || "Account";
    el.onclick = null;
    renderAccountAvatar(el, user);
  } else {
    el.setAttribute("href", "login.html"); // fallback if JS fails
    el.setAttribute("aria-label", "Login");
    el.title = "Login";
    el.innerHTML = ACCOUNT_ICON_SVG;
    el.onclick = (e) => {
      e.preventDefault();
      window.openAuthModal("login");
    };
  }
}

/**
 * Auto-opens the signup popup once per browser session for visitors
 * who aren't logged in yet. Shows on the first page they land on;
 * won't reappear on later pages in the same session (or after they
 * dismiss it), even if they're still logged out.
 */
const SIGNUP_PROMPT_KEY = "orenka_signup_prompt_shown";

async function maybeShowSignupPrompt() {
  if (sessionStorage.getItem(SIGNUP_PROMPT_KEY)) return;
  sessionStorage.setItem(SIGNUP_PROMPT_KEY, "1");

  const user = await getCurrentUser();
  if (user) return;

  setTimeout(() => {
    window.openAuthModal("signup");
  }, 1200);
}

document.addEventListener("DOMContentLoaded", () => {
  syncAccountUI();
  maybeShowSignupPrompt();
});