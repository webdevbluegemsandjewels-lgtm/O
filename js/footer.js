/* Injects the shared site footer into <footer id="footer"></footer> */
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="index.html" class="brand">OrenkaFine</a>
          <p>The world is my catwalk. Fine and fashion jewelry designed for everyday elegance, since 1994.</p>
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
            <li><a href="collections.html?cat=Pendants">Pendants</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Services</h5>
          <ul>
            <li><a href="contact.html">Our Services</a></li>
            <li><a href="contact.html">Point of Sale</a></li>
            <li><a href="about.html">Care Guide</a></li>
            <li><a href="about.html">Journal</a></li>
            <li><a href="contact.html">FAQ</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>OrenkaFine</h5>
          <ul>
            <li><a href="about.html">The House</a></li>
            <li><a href="founder.html">Our Founder</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Legal</h5>
          <ul>
            <li><a href="#">Terms &amp; Conditions</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Warranty</a></li>
            <li><a href="#">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 OrenkaFine Jewelry B.V. All rights reserved.</span>
        <div class="legal-links">
          <a href="#">Disclaimer</a>
          <a href="#">Terms of Sale</a>
          <a href="#">Sitemap</a>
        </div>
      </div>
    </div>
  `;
});
