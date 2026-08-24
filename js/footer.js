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
    ["Necklaces", "collections.html?cat=Necklaces"],
    ["Bangles & Bracelets", "collections.html?cat=Bracelets"],
    ["Earrings", "collections.html?cat=Earrings"],
    ["Custom Solitaire Jewellery", "collections.html?cat=Rings"],
    ["Loose Diamonds", "collections.html"],
    ["Charms & Pendants", `collections.html?cat=${encodeURIComponent("Charms & Pendants")}`],
    ["Gold Chains", "collections.html?cat=Necklaces"],
    ["Engravable Jewellery", "collections.html"],
    ["Nose Pins", "collections.html"],
    ["Men's Jewellery", "mens-collection.html"],
    ["Under ₹15K", "collections.html?maxPrice=15000"],
    ["Under ₹25K", "collections.html?maxPrice=25000"],
    ["Mangalsutra", "collections.html?cat=Necklaces"],
    ["Pre-Set Solitaire Rings", "collections.html?cat=Rings"],
    ["Diamond Earrings", "collections.html?cat=Earrings"],
  ];
  const POPULAR_COLLECTIONS = [
    ["Script Necklaces", "collections.html?cat=Necklaces"],
    ["Evil Eye Collection", "collections.html"],
    ["Bunchberry Collection", "collections.html"],
    ["Space Letter Necklaces", "collections.html?cat=Necklaces"],
    ["Tiny Studs", "collections.html?cat=Earrings"],
    ["Name Necklaces", "collections.html?cat=Necklaces"],
    ["Office Wear Jewellery", "collections.html"],
    ["Eternity Rings", "collections.html?cat=Rings"],
    ["Fashion Earrings", "collections.html?cat=Earrings"],
    ["Pendant Necklaces", "collections.html?cat=Necklaces"],
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
            <a href="#" class="icon-btn" aria-label="Instagram">IG</a>
            <a href="#" class="icon-btn" aria-label="Facebook">FB</a>
            <a href="#" class="icon-btn" aria-label="Pinterest">PI</a>
          </div>
        </div>
        <div class="footer-col">
          <h5>Shop</h5>
          <ul>
            <li><a href="collections.html?cat=Rings">Rings</a></li>
            <li><a href="collections.html?cat=Necklaces">Necklaces</a></li>
            <li><a href="collections.html?cat=Earrings">Earrings</a></li>
            <li><a href="collections.html?cat=Bracelets">Bracelets</a></li>
            <li><a href="collections.html?cat=${encodeURIComponent("Charms & Pendants")}">Pendants</a></li>
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
            <li><a href="#" data-guide="necklace">Necklace Size Guide</a></li>
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
            <li><a href="about.html">Terms &amp; Conditions</a></li>
            <li><a href="about.html">Privacy Policy</a></li>
            <li><a href="about.html">Warranty</a></li>
            <li><a href="about.html">Cookie Policy</a></li>
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
        <span>&copy; 2026 OrenkaFine jewellery B.V. All rights reserved.</span>
        <div class="legal-links">
          <a href="#">Disclaimer</a>
          <a href="#">Terms of Sale</a>
          <a href="#">Sitemap</a>
        </div>
      </div>
    </div>
  `;
});
