/* =========================================================
   OrenkaFine — auth modal (login / signup popup)
   Injects itself into the page once. Cancellable via the
   X button, the Escape key, or clicking the backdrop.

   Usage:
     const user = await window.openAuthModal();       // defaults to login tab
     const user = await window.openAuthModal("signup"); // opens on signup tab
     // Resolves with the Supabase user object on success,
     // or null if the person cancels.
   ========================================================= */

(function () {
  let modalEl = null;
  let resolveFn = null;

  function buildModal() {
    const wrap = document.createElement("div");
    wrap.className = "auth-modal-backdrop";
    wrap.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-label="Log in or sign up">
        <button type="button" class="auth-modal-close" aria-label="Close">&times;</button>

        <div class="auth-modal-tabs">
          <button type="button" class="auth-modal-tab active" data-tab="login">Log In</button>
          <button type="button" class="auth-modal-tab" data-tab="signup">Sign Up</button>
        </div>

        <p class="auth-error" data-role="error" style="display:none;"></p>
        <p class="auth-success" data-role="success" style="display:none;"></p>

        <form data-role="login-form">
          <div class="auth-field">
            <label>Email</label>
            <input type="email" required autocomplete="email" data-role="login-email" />
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" required autocomplete="current-password" data-role="login-password" />
          </div>
          <button type="submit" class="btn btn-gold auth-submit" data-role="login-submit">Log In</button>
        </form>

        <form data-role="signup-form" style="display:none;">
          <div class="auth-field">
            <label>Full name</label>
            <input type="text" required autocomplete="name" data-role="signup-name" />
          </div>
          <div class="auth-field">
            <label>Email</label>
            <input type="email" required autocomplete="email" data-role="signup-email" />
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" required minlength="6" autocomplete="new-password" data-role="signup-password" />
            <p class="hint">At least 6 characters.</p>
          </div>
          <div class="auth-field">
            <label>Phone</label>
            <input type="tel" required autocomplete="tel" data-role="signup-phone" />
          </div>
          <div class="auth-field">
            <label>Address line 1</label>
            <input type="text" required autocomplete="address-line1" data-role="signup-address1" />
          </div>
          <div class="auth-field">
            <label>Address line 2 <span class="hint-inline">(optional)</span></label>
            <input type="text" autocomplete="address-line2" data-role="signup-address2" />
          </div>
          <div class="auth-field auth-field-row">
            <div>
              <label>City</label>
              <input type="text" required autocomplete="address-level2" data-role="signup-city" />
            </div>
            <div>
              <label>State</label>
              <input type="text" required autocomplete="address-level1" data-role="signup-state" />
            </div>
          </div>
          <div class="auth-field">
            <label>Pincode</label>
            <input type="text" required inputmode="numeric" autocomplete="postal-code" data-role="signup-pincode" />
          </div>
          <button type="submit" class="btn btn-gold auth-submit" data-role="signup-submit">Sign Up</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);
    return wrap;
  }

  function switchTab(modal, tab) {
    modal.querySelectorAll(".auth-modal-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    modal.querySelector('[data-role="login-form"]').style.display = tab === "login" ? "block" : "none";
    modal.querySelector('[data-role="signup-form"]').style.display = tab === "signup" ? "block" : "none";
    hideMessages(modal);
  }

  function hideMessages(modal) {
    modal.querySelector('[data-role="error"]').style.display = "none";
    modal.querySelector('[data-role="success"]').style.display = "none";
  }

  function showError(modal, msg) {
    const el = modal.querySelector('[data-role="error"]');
    el.textContent = msg;
    el.style.display = "block";
  }

  function close(result) {
    if (!modalEl) return;
    const wrap = modalEl;
    const modal = wrap.querySelector(".auth-modal");
    wrap.classList.add("closing");
    if (modal) modal.classList.add("closing");
    document.removeEventListener("keydown", onKeydown);
    modalEl = null;
    setTimeout(() => {
      wrap.remove();
      if (!modalEl) document.body.classList.remove("auth-modal-open");
    }, 280);
    if (resolveFn) {
      resolveFn(result);
      resolveFn = null;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") close(null);
  }

  window.openAuthModal = function (initialTab) {
    if (modalEl) close(null); // close any existing instance first

    const wrap = buildModal();
    modalEl = wrap;
    const modal = wrap.querySelector(".auth-modal");
    document.body.classList.add("auth-modal-open");

    switchTab(modal, initialTab === "signup" ? "signup" : "login");

    wrap.querySelector(".auth-modal-close").addEventListener("click", () => close(null));
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close(null); // backdrop click
    });
    document.addEventListener("keydown", onKeydown);

    modal.querySelectorAll(".auth-modal-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(modal, btn.dataset.tab));
    });

    // --- Login ---
    modal.querySelector('[data-role="login-form"]').addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessages(modal);
      const btn = modal.querySelector('[data-role="login-submit"]');
      btn.disabled = true;
      btn.textContent = "Logging in…";

      const email = modal.querySelector('[data-role="login-email"]').value.trim();
      const password = modal.querySelector('[data-role="login-password"]').value;

      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      btn.disabled = false;
      btn.textContent = "Log In";

      if (error) {
        showError(modal, error.message);
        return;
      }

      if (typeof syncAccountUI === "function") syncAccountUI();
      close(data.user);
    });

    // --- Signup ---
    modal.querySelector('[data-role="signup-form"]').addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessages(modal);
      const btn = modal.querySelector('[data-role="signup-submit"]');
      btn.disabled = true;
      btn.textContent = "Creating account…";

      const fullName = modal.querySelector('[data-role="signup-name"]').value.trim();
      const email = modal.querySelector('[data-role="signup-email"]').value.trim();
      const password = modal.querySelector('[data-role="signup-password"]').value;
      const phone = modal.querySelector('[data-role="signup-phone"]').value.trim();
      const addressLine1 = modal.querySelector('[data-role="signup-address1"]').value.trim();
      const addressLine2 = modal.querySelector('[data-role="signup-address2"]').value.trim();
      const city = modal.querySelector('[data-role="signup-city"]').value.trim();
      const state = modal.querySelector('[data-role="signup-state"]').value.trim();
      const pincode = modal.querySelector('[data-role="signup-pincode"]').value.trim();

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            address_line1: addressLine1,
            address_line2: addressLine2,
            city,
            state,
            pincode,
          },
        },
      });

      btn.disabled = false;
      btn.textContent = "Sign Up";

      if (error) {
        showError(modal, error.message);
        return;
      }

      if (data.session) {
        if (typeof syncAccountUI === "function") syncAccountUI();
        close(data.user);
      } else {
        modal.querySelector('[data-role="signup-form"]').reset();
        const successEl = modal.querySelector('[data-role="success"]');
        successEl.textContent = "Account created! Check your email to confirm, then log in.";
        successEl.style.display = "block";
      }
    });

    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  };
})();
