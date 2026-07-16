/* =========================================================
   MIRWA — auth helpers (Supabase Auth)
   Browsing stays open to everyone. Only specific actions
   (writing a review, placing an order) call requireAuth().
   ========================================================= */

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
 * Returns the user if logged in; otherwise redirects to login.html
 * with a redirect param pointing back to the current page, and
 * returns null.
 */
async function requireAuth() {
  const user = await getCurrentUser();
  if (user) return user;

  const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `login.html?redirect=${redirectTo}`;
  return null;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

/**
 * Updates the header account icon/link to reflect session state.
 * Looks for an element with [data-account-link]. If logged in,
 * it becomes a logout trigger; otherwise it links to login.html.
 */
async function syncAccountUI() {
  const el = document.querySelector("[data-account-link]");
  if (!el) return;

  const user = await getCurrentUser();
  if (user) {
    el.setAttribute("href", "#");
    el.setAttribute("aria-label", "Log out");
    el.title = user.email ? `Log out (${user.email})` : "Log out";
    el.onclick = (e) => { e.preventDefault(); logout(); };
  } else {
    el.setAttribute("href", "login.html");
    el.setAttribute("aria-label", "Login");
    el.title = "Login";
    el.onclick = null;
  }
}

document.addEventListener("DOMContentLoaded", syncAccountUI);