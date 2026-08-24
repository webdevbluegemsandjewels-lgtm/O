/* =========================================================
   OrenkaFine — site behavior
   ========================================================= */

// Escapes user-supplied text (review names/comments, cart line
// details, anything not admin-controlled) before it's interpolated
// into innerHTML — without this, e.g. a signup full_name of
// "<img src=x onerror=...>" renders and executes for every visitor
// who views that person's review.
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

const DEFAULT_SUPABASE_S3_ENDPOINT = "https://xjepiecjsomrallliifj.storage.supabase.co/storage/v1/s3";
const DEFAULT_SUPABASE_BUCKET = "Images";

const SUPABASE_S3_ENDPOINT = window.OrenkaFine_SUPABASE_S3_ENDPOINT || DEFAULT_SUPABASE_S3_ENDPOINT;
const SUPABASE_BUCKET_NAME = window.OrenkaFine_SUPABASE_BUCKET_NAME || DEFAULT_SUPABASE_BUCKET;
const SUPABASE_PUBLIC_BASE = `${SUPABASE_S3_ENDPOINT.replace(/\/s3\/?$/, "")}/object/public/${SUPABASE_BUCKET_NAME}`;

function normalizeBucketKey(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const slash = cleanPath.indexOf("/");
  if (slash === -1) return cleanPath;
  const head = cleanPath.slice(0, slash).toLowerCase();
  const tail = cleanPath.slice(slash + 1);
  if (head === "products") return `Products/${tail}`;
  if (head === "assets") return `Assets/${tail}`;
  if (head === "dgc") return `Dgc/${tail}`;
  if (head === "index") return `Index/${tail}`;
  return cleanPath;
}

function toBucketUrl(path) {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const cleanPath = normalizeBucketKey(path);
  if (!/^(products|assets|dgc|index)\//i.test(cleanPath)) return path;
  return `${SUPABASE_PUBLIC_BASE}/${cleanPath}`;
}

function rewriteStaticAssetUrls() {
  const touchedVideos = new Set();
  document.querySelectorAll("img[src], source[src], video[poster]").forEach((el) => {
    if (el.hasAttribute("src")) {
      const src = el.getAttribute("src");
      const mapped = toBucketUrl(src);
      if (mapped !== src) {
        el.setAttribute("src", mapped);
        const video = el.tagName === "SOURCE" ? el.closest("video") : null;
        if (video) touchedVideos.add(video);
      }
    }
    if (el.hasAttribute("poster")) {
      const poster = el.getAttribute("poster");
      const mappedPoster = toBucketUrl(poster);
      if (mappedPoster !== poster) el.setAttribute("poster", mappedPoster);
    }
  });

  touchedVideos.forEach((video) => {
    if (typeof video.load === "function") video.load();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  rewriteStaticAssetUrls();

  /* Mobile nav toggle */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open-mobile");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Back to top button */
  const toTop = document.querySelector(".to-top");
  if (toTop) {
    window.addEventListener("scroll", () => {
      toTop.classList.toggle("visible", window.scrollY > 600);
    });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* Newsletter form (demo only, no backend) */
  document.querySelectorAll(".newsletter-form, .contact-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const original = btn ? btn.textContent : "";
      if (btn) {
        btn.textContent = "Thank you!";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
          form.reset();
        }, 2600);
      }
    });
  });

  /* Product grid renderer (used on collections page) */
  const grid = document.querySelector("[data-product-grid]");
  if (grid && typeof PRODUCTS !== "undefined") {
    const filterRow = document.querySelector("[data-filter-row]");
    const render = (list) => {
      grid.innerHTML = list.map(productCardHTML).join("");
    };
    render(PRODUCTS);
    attachProductHoverSwap();

    if (filterRow) {
      filterRow.addEventListener("click", (e) => {
        const pill = e.target.closest(".filter-pill");
        if (!pill) return;
        filterRow.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        const cat = pill.dataset.cat;
        render(cat === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat));
        attachProductHoverSwap();
      });
    }
  }

  /* Homepage featured strip */
  const featured = document.querySelector("[data-featured-grid]");
  if (featured && typeof PRODUCTS !== "undefined") {
    featured.innerHTML = PRODUCTS.slice(0, 8).map(productCardHTML).join("");
    attachProductHoverSwap();
  }

  const unique = document.getElementById("unique-picks");
  if (unique && typeof PRODUCTS !== "undefined") {
    unique.innerHTML = PRODUCTS.slice(4, 8).map(productCardHTML).join("");
    attachProductHoverSwap();
  }

  const hotspots = document.querySelectorAll(".hotspot");
  if (hotspots.length) {
    hotspots.forEach((pin) => {
      pin.addEventListener("click", function (e) {
        e.stopPropagation();
        hotspots.forEach((x) => {
          if (x !== this) x.classList.remove("active");
        });
        this.classList.toggle("active");
      });
    });

    document.addEventListener("click", () => {
      hotspots.forEach((x) => x.classList.remove("active"));
    });
  }

  if (window.OrenkaFineCart && typeof window.OrenkaFineCart.getItems === "function") {
    // badge is also updated on its own DOMContentLoaded inside cart.js,
    // but re-run here in case main.js's listener fires after items are rendered
    const count = window.OrenkaFineCart.getItems().reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = count > 0 ? String(count) : "";
      el.style.display = count > 0 ? "inline-flex" : "none";
    });
  }
});

// Drives a ".marquee-track" (duplicated-content, infinite-loop strip):
// auto-scrolls via rAF, pauses on hover, and lets the user grab/drag
// (mouse or touch, via Pointer Events) to scroll it manually. Dragging
// past a few pixels suppresses the click so it doesn't also navigate
// a product-card-link underneath the pointer.
function initDraggableMarquee(track, pxPerSecond) {
  if (!track || track.dataset.marqueeInit) return;
  track.dataset.marqueeInit = "1";
  track.style.animation = "none";
  track.style.cursor = "grab";
  track.style.touchAction = "pan-y";

  let x = 0;
  let halfWidth = track.scrollWidth / 2;
  let hovered = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let dragDistance = 0;
  let lastTime = null;

  const recalc = () => { halfWidth = track.scrollWidth / 2 || 1; };
  new ResizeObserver(recalc).observe(track);

  const apply = () => { track.style.transform = `translateX(${x}px)`; };
  const wrap = () => {
    if (x <= -halfWidth) x += halfWidth;
    if (x > 0) x -= halfWidth;
  };

  function frame(t) {
    if (lastTime == null) lastTime = t;
    const dt = (t - lastTime) / 1000;
    lastTime = t;
    if (!dragging && !hovered) {
      x -= pxPerSecond * dt;
      wrap();
      apply();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  track.addEventListener("mouseenter", () => { hovered = true; });
  track.addEventListener("mouseleave", () => { hovered = false; });

  // Pointer capture / active dragging only kick in once the pointer has
  // actually moved past a small threshold — a plain click/tap on a
  // product-card-link (or any button) inside the track is never touched,
  // so it navigates exactly like it would outside the marquee.
  let pointerDownId = null;
  let pressStartX = 0;

  track.addEventListener("pointerdown", (e) => {
    pointerDownId = e.pointerId;
    dragDistance = 0;
    pressStartX = e.clientX;
  });
  track.addEventListener("pointermove", (e) => {
    if (pointerDownId !== e.pointerId) return;
    if (!dragging) {
      if (Math.abs(e.clientX - pressStartX) < 4) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartTranslate = x;
      track.style.cursor = "grabbing";
      track.setPointerCapture(e.pointerId);
    }
    dragDistance += Math.abs(e.movementX || 0);
    x = dragStartTranslate + (e.clientX - dragStartX);
    wrap();
    apply();
  });
  const endDrag = () => {
    pointerDownId = null;
    dragging = false;
    track.style.cursor = "grab";
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  // Swallow the click that follows an actual drag so it doesn't also
  // trigger navigation on a product-card-link the pointer ends up over.
  track.addEventListener("click", (e) => {
    if (dragDistance > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

function attachProductHoverSwap() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const img = card.querySelector("img");
    if (!img) return;
    const secondary = img.dataset.secondary;
    if (!secondary || secondary === img.src) return;
    if (!img.dataset.original) {
      img.dataset.original = img.src;
    }
    card.addEventListener("mouseenter", () => { img.src = secondary; });
    card.addEventListener("mouseleave", () => { img.src = img.dataset.original; });
  });
}

function productCardHTML(p) {
  const primaryImage = toBucketUrl(p.image);
  const secondaryImage = toBucketUrl(p.secondaryImage || p.image);
  const swatches = (p.colors || [])
    .map((c) => `<span class="swatch" style="background:${COLOR_SWATCHES[c] || "#ccc"}" title="${c}"></span>`)
    .join("");

  const ratingHTML = p.rating
    ? `<span class="product-rating">${p.rating} <span class="star">★</span></span>`
    : "";

  const priceHTML = p.oldPrice
    ? `<span class="price-now">${p.price}</span>
       <span class="price-old">${p.oldPrice}</span>
       <span class="price-save">SAVE ${p.oldPrice.replace(/[^\d₹]/g, "")}</span>`
    : `<span class="price-now">${p.price}</span>`;

  // Real DB-backed products have a slug -> link to the product detail page.
  // Legacy static placeholder products (no slug) stay unlinked for now.
  const href = p.slug ? `${p.detailPage || "product.html"}?slug=${encodeURIComponent(p.slug)}` : null;
  const openTag = href ? `<a href="${href}" class="product-card-link">` : "";
  const closeTag = href ? `</a>` : "";

  return `
    <article class="product-card">
      ${openTag}
      <div class="product-media">
        ${p.discount ? `<span class="discount-ribbon">${p.discount} OFF</span>` : ""}
        ${(p.tag && !p.discount) ? `<span class="product-tag">${p.tag}</span>` : ""}
        <button class="product-wish" aria-label="Add ${p.name} to wishlist" onclick="event.preventDefault()">&hearts;</button>
        <img src="${primaryImage}" data-secondary="${secondaryImage}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='" />
      </div>
      <div class="product-info">
        <div class="price-row">${priceHTML}</div>
        <h3 class="product-name">${p.name} ${ratingHTML}</h3>
        <p class="product-cat">${p.goldType || p.cat}</p>
        <div class="swatch-row">${swatches}</div>
      </div>
      ${closeTag}
    </article>
  `;
}