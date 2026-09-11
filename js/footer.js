/* Injects the shared site footer into <footer id="footer"></footer> */
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("footer");
  if (!el || el.children.length) return;

  // Terms that match a real shop category deep-link straight into it
  // (collections.html?cat=…, case-insensitive match against collections.html's
  // SHOP_CATS) or, for price bands, into its maxPrice filter. Terms with no
  // matching category/price filter (marketing collection names, unstocked
  // categories) fall back to the general collections page.
  const POPULAR_SEARCHES = [
    ["Rings", "collections.html?cat=Rings"],
    ["Bangles & Bracelets", "collections.html?cat=Bracelets"],
    ["Earrings", "collections.html?cat=Earrings"],
    ["Custom Solitaire Jewellery", "collections.html?cat=Rings"],
    ["Loose Diamonds", "collections.html"],
    ["Pendants", "collections.html?cat=Pendants"],
    ["Charms", "collections.html?cat=Charms"],
    ["Engravable Jewellery", "collections.html"],
    ["Nose Pins", "collections.html"],
    ["Under ₹15K", "collections.html?maxPrice=15000"],
    ["Under ₹25K", "collections.html?maxPrice=25000"],
    ["Pre-Set Solitaire Rings", "collections.html?cat=Rings"],
    ["Diamond Earrings", "collections.html?cat=Earrings"],
  ];
  const POPULAR_COLLECTIONS = [
    ["Evil Eye Collection", "collections.html"],
    ["Bunchberry Collection", "collections.html"],
    ["Tiny Studs", "collections.html?cat=Earrings"],
    ["Office Wear Jewellery", "collections.html"],
    ["Eternity Rings", "collections.html?cat=Rings"],
    ["Fashion Earrings", "collections.html?cat=Earrings"],
    ["Pendant Charms", "collections.html?cat=Charms"],
  ];
  const popularLinksHTML = (items) =>
    items.map(([label, href]) => `<a href="${href}">${label}</a>`).join('<span aria-hidden="true">|</span>');

  el.innerHTML = `
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="index.html" class="brand">OrenkaFine</a>
          <p>Find your exquisite. Fine and fashion jewellery designed for everyday elegance, since 1996.</p>
          <div class="footer-social">
            <a href="https://www.instagram.com/orenkafine/" class="icon-btn" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 448 512" aria-hidden="true">
                <defs>
                  <linearGradient id="footerIgGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#f09433" />
                    <stop offset="30%" stop-color="#e6683c" />
                    <stop offset="60%" stop-color="#dc2743" />
                    <stop offset="80%" stop-color="#cc2366" />
                    <stop offset="100%" stop-color="#bc1888" />
                  </linearGradient>
                </defs>
                <path fill="url(#footerIgGrad)" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
              </svg>
            </a>
            <a href="#" class="icon-btn" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 320 512" aria-hidden="true">
                <path fill="#1877F2" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
              </svg>
            </a>
            <a href="#" class="icon-btn" aria-label="Pinterest">
              <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true">
                <path fill="#E60023" d="M204 6.5C101.4 6.5 0 74.9 0 185.6 0 256 39.6 296 63.6 296c9.9 0 15.6-27.6 15.6-35.4 0-9.3-23.7-29.1-23.7-67.8 0-80.4 61.2-137.4 140.4-137.4 68.1 0 118.5 38.7 118.5 110.1 0 53.1-21.3 152.7-90.3 152.7-24.9 0-46.2-18-46.2-43.8 0-37.8 26.4-74.4 26.4-113.4 0-66.2-93.9-54.2-93.9 25.8 0 16.8 2.1 35.4 9.6 50.7-13.8 59.4-42 148.2-42 209.4 0 18.9 2.7 37.5 4.5 56.4 3.4 3.8 1.7 3.4 6.9 1.5 50.4-69 48.6-82.5 71.4-172.8 12.3 23.4 44.1 36 69.3 36 106.2 0 153.9-103.5 153.9-196.8C384 71.3 298.2 6.5 204 6.5z"/>
              </svg>
            </a>
          </div>
        </div>
        <div class="footer-col">
          <h5>Shop</h5>
          <ul>
            <li><a href="collections.html?cat=Rings">Rings</a></li>
            <li><a href="collections.html?cat=Earrings">Earrings</a></li>
            <li><a href="collections.html?cat=Bracelets">Bracelets</a></li>
            <li><a href="collections.html?cat=Pendants">Pendants</a></li>
            <li><a href="collections.html?cat=Charms">Charms</a></li>
            <li><a href="gift-card.html">Gift Cards</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Services</h5>
          <ul>
            <li><a href="contact.html">Our Services</a></li>
            <li><a href="contact.html">Point of Sale</a></li>
            <li><a href="care-guide.html">Care Guide</a></li>
            <li><a href="about.html">Journal</a></li>
            <li><a href="purchase-with-peace.html">Purchase with Peace</a></li>
            <li><a href="loyalty-program.html">Loyalty Program & FAQ</a></li>
          </ul>
        </div>
        <div class="footer-col"> 
          <h5>Size Guide</h5>
          <ul>
            <li><a href="#" data-guide="size">Ring Size Guide</a></li>
            <li><a href="#" data-guide="diamond">Diamond Size Guide</a></li>
            <li><a href="#" data-guide="gold">Gold Size Guide</a></li>
            <li><a href="#" data-guide="bracelet">Bracelet Size Guide</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>OrenkaFine</h5>
          <ul>
            <li><a href="our-journey.html">Our Story</a></li>
            <li><a href="about.html">The House</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Legal</h5>
          <ul>
            <li><a href="terms.html">Terms &amp; Conditions</a></li>
            <li><a href="privacy-policy.html">Privacy Policy</a></li>
            <li><a href="cookie-policy.html">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="popular-searches">
        <div class="popular-block">
          <h5>Popular Searches</h5>
          <nav class="popular-links" aria-label="Popular searches">${popularLinksHTML(POPULAR_SEARCHES)}</nav>
        </div>
        <div class="popular-block">
          <h5>Popular Collections</h5>
          <nav class="popular-links" aria-label="Popular collections">${popularLinksHTML(POPULAR_COLLECTIONS)}</nav>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 OrenkaFine jewellery. All rights reserved.</span>
        <div class="legal-links">
          <a href="#">Sitemap</a>
        </div>
      </div>
    </div>
  `;
});
