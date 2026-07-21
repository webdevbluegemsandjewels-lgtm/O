/* =========================================================
   OrenkaFine — site search
   Wires up every button[aria-label="Search"] in the header to
   open a search overlay. Products are fetched straight from
   Supabase (not js/products-db.js, since not every page that has
   the search icon also loads that script) and cached in memory
   for the rest of the page visit.
   ========================================================= */

(function () {
  let overlayEl = null;
  let productsPromise = null;

  function resolveImage(path) {
    return typeof toBucketUrl === "function" ? toBucketUrl(path) : path;
  }

  function money(n) {
    return `₹${Number(n).toLocaleString("en-IN")}`;
  }

  function loadSearchableProducts() {
    if (!productsPromise) {
      productsPromise = supabaseClient
        .from("products")
        .select("id, slug, name, brand, category, price, image")
        .eq("is_active", true)
        .then(({ data, error }) => {
          if (error) {
            console.error("Search: failed to load products:", error.message);
            return [];
          }
          return data || [];
        });
    }
    return productsPromise;
  }

  function buildOverlay() {
    const wrap = document.createElement("div");
    wrap.className = "search-overlay-backdrop";
    wrap.innerHTML = `
      <div class="search-overlay" role="dialog" aria-modal="true" aria-label="Search products">
        <div class="search-overlay-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="searchInput" placeholder="Search rings, necklaces, earrings…" autocomplete="off" />
          <button type="button" class="search-overlay-close" aria-label="Close search">&times;</button>
        </div>
        <div class="search-overlay-results" id="searchResults"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    return wrap;
  }

  function renderResults(container, query, products) {
    const q = query.trim().toLowerCase();

    if (!q) {
      container.innerHTML = `<p class="search-hint">Start typing to search the collection.</p>`;
      return;
    }

    const matches = products
      .filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
      )
      .slice(0, 20);

    if (!matches.length) {
      container.innerHTML = `<p class="search-hint">No products found for &ldquo;${query.replace(/</g, "&lt;")}&rdquo;.</p>`;
      return;
    }

    container.innerHTML = matches.map((p) => `
      <a class="search-result-row" href="product.html?slug=${encodeURIComponent(p.slug)}">
        <img src="${resolveImage(p.image)}" alt="" />
        <span class="search-result-info">
          <span class="search-result-name">${p.name}</span>
          <span class="search-result-cat">${p.category || ""}</span>
        </span>
        <span class="search-result-price">${money(p.price)}</span>
      </a>
    `).join("");
  }

  function openOverlay() {
    if (!overlayEl) overlayEl = buildOverlay();

    const input = overlayEl.querySelector("#searchInput");
    const results = overlayEl.querySelector("#searchResults");
    const closeBtn = overlayEl.querySelector(".search-overlay-close");

    document.body.classList.add("search-overlay-open");
    overlayEl.classList.add("open");

    results.innerHTML = `<p class="search-hint">Loading products…</p>`;
    loadSearchableProducts().then((products) => renderResults(results, input.value, products));

    input.oninput = () => {
      loadSearchableProducts().then((products) => renderResults(results, input.value, products));
    };

    function close() {
      overlayEl.classList.remove("open");
      document.body.classList.remove("search-overlay-open");
      document.removeEventListener("keydown", onKeydown);
    }
    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    closeBtn.onclick = close;
    overlayEl.onclick = (e) => {
      if (e.target === overlayEl) close();
    };
    document.addEventListener("keydown", onKeydown);

    setTimeout(() => input.focus(), 50);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('button[aria-label="Search"]').forEach((btn) => {
      btn.addEventListener("click", openOverlay);
    });
  });
})();
