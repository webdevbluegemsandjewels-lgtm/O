
  const TESTIMONIALS = [
    { name: "Priya Sharma", text: "The quality exceeded my expectations. The finish, sparkle, and craftsmanship are absolutely beautiful." },
    { name: "Rahul Mehta", text: "I love knowing that I'm buying directly from the brand. The quality is outstanding and the pricing feels honest." },
    { name: "Neha Kapoor", text: "Elegant packaging, quick delivery, and a necklace that looks even more stunning in person." },
    { name: "Aditi Verma", text: "My favourite jewellery purchase. Beautifully crafted and perfect for everyday luxury." },
  ];
  function testimonialCardHTML(t) {
    return `
      <div class="testimonial-card testimonial-item">
        <p class="stars">★★★★★</p>
        <p>&ldquo;${t.text}&rdquo;</p>
        <span>${t.name}</span>
      </div>
    `;
  }
  const testimonialTrack = document.getElementById("testimonialTrack");
  if (testimonialTrack) {
    testimonialTrack.innerHTML = [...TESTIMONIALS, ...TESTIMONIALS].map(testimonialCardHTML).join("");
    initDraggableMarquee(testimonialTrack, 60);
  }
  const recommendTrack = document.getElementById("recommendTrack");
  if (recommendTrack && typeof loadProductsFromDB === "function") {
    loadProductsFromDB().then((products) => {
      const picks = products.slice(0, 10);
      if (!picks.length) return;
      recommendTrack.innerHTML = [...picks, ...picks]
        .map((p) => `<div class="recommend-item">${productCardHTML(p)}</div>`)
        .join("");
      attachProductHoverSwap();
      initDraggableMarquee(recommendTrack, 50);
    });
  }

  // "Three decades of craft" scroll-scrubbed frame sequence: scrolling
  // through the (tall) section maps 1:1 onto the 151-frame sequence, and
  // the four milestones fade in over it in a left / center / right zigzag.
  // Frames start preloading immediately on page load (not lazily on
  // scroll-into-view) so playback is smooth by the time the user gets here.
  (function initCraftScroll() {
    const section = document.getElementById("craftScroll");
    const canvas = document.getElementById("craftCanvas");
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    const loadingEl = document.getElementById("craftLoading");
    const blocks = Array.from(section.querySelectorAll(".craft-text-block"));

    const FRAME_COUNT = 151;
    const FRAME_BASE = "https://xjepiecjsomrallliifj.supabase.co/storage/v1/object/public/Images/TheHouse/Frames/";
    const frameUrl = (n) => `${FRAME_BASE}ezgif-frame-${String(n).padStart(3, "0")}.jpg`;

    const frames = new Array(FRAME_COUNT);
    let lastDrawnIndex = -1;

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      lastDrawnIndex = -1; // force redraw at new size
    }

    function drawFrame(index) {
      let img = frames[index];
      if (!img || !img.complete || !img.naturalWidth) {
        if (lastDrawnIndex === -1) return;
        index = lastDrawnIndex;
        img = frames[index];
        if (!img || !img.complete) return;
      }
      if (index === lastDrawnIndex) return;
      lastDrawnIndex = index;
      const cw = canvas.width, ch = canvas.height;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    function preloadFrames() {
      for (let n = 1; n <= FRAME_COUNT; n++) {
        const img = new Image();
        img.decoding = "async";
        img.src = frameUrl(n);
        if (n === 1) {
          img.onload = () => {
            lastDrawnIndex = -1;
            drawFrame(0);
            loadingEl.classList.add("hidden");
          };
        }
        frames[n - 1] = img;
      }
    }

    function updateOnScroll() {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;

      drawFrame(Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT)));

      blocks.forEach((block) => {
        const [start, end] = block.dataset.range.split(",").map(Number);
        block.classList.toggle("active", progress >= start && progress <= end);
      });
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { updateOnScroll(); ticking = false; });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { resizeCanvas(); updateOnScroll(); });

    resizeCanvas();
    preloadFrames();
    updateOnScroll();
  })();
