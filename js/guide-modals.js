/* =========================================================
   OrenkaFine — Gold / Diamond / Ring-size guide popups
   Triggered by any element with data-guide="gold|diamond|size".
   ========================================================= */

(function () {
  const DIAMOND_ICON = (label, filled) => `
    <div class="guide-diamond-icon">
      <svg width="30" height="30" viewBox="0 0 24 24">
        <polygon points="12,2 21,8 17,22 7,22 3,8" fill="none" stroke="var(--gold)" stroke-width="1.2"/>
        <polygon points="12,2 21,8 3,8" fill="${filled}" stroke="var(--gold)" stroke-width="1"/>
      </svg>
      <span>${label}</span>
    </div>
  `;

  const CONTENT = {
    gold: {
      title: "GOLD PURITY GUIDE",
      body: `
        <p class="guide-lead">Looking for the perfect piece of gold jewellery but not sure which metal to choose? <strong>We're here to help!</strong></p>
        <div class="guide-card-row">
          <div class="guide-card">
            <h5>18 Karat</h5>
            <p>We offer 18 karat jewellery in yellow, rose &amp; white colors. 75 percent is pure Swiss gold and the remaining 25 percent is the master alloy that gives color to the gold.</p>
          </div>
          <div class="guide-card">
            <h5>14 Karat</h5>
            <p>In the case of 14 Karat, 58.5% is pure Swiss gold and the remaining 41.5% is the master alloy that gives color to the gold.</p>
          </div>
          <div class="guide-card">
            <h5>9 Karat</h5>
            <p>In the case of 9 Karat, 37.5% is pure Swiss gold and the remaining 62.5% is the master alloy that gives color to the gold. It's the most durable and affordable of our gold options, ideal for everyday-wear pieces.</p>
          </div>
        </div>
        <p class="guide-note"><strong>The master alloy used in our jewellery makes our jewellery wear-resistant, non-oxidized, and perfect for everyday wear and forever.</strong></p>
        <div class="guide-cert-row">
          <div class="guide-cert-badge">BIS</div>
          <p>At OrenkaFine, all our jewellery conforms to a set of standards laid by the Bureau of Indian Standards (BIS). Each piece is certified/hallmarked and the HUID is mentioned on the invoice.</p>
        </div>
      `,
    },
    diamond: {
      title: "DIAMOND GUIDE",
      body: `
        <p class="guide-heading-bold">When it comes to buying a diamond, understanding quality is the key.</p>
        <p class="guide-lead">At OrenkaFine, we want to make sure our customers have all the information they need to make an informed decision.</p>

        <h5 class="guide-subhead">Diamond Color</h5>
        <p>Diamonds are graded for color on a scale from D (colorless) to Z (light yellow/brown). The less color a diamond has, the more valuable it is.</p>
        <p><strong>D, E, F:</strong> Colorless. These diamonds have no detectable color and are the most rare and valuable.</p>
        <p><strong>G, H, I, J:</strong> Near-colorless. These diamonds may have a hint of color, but it is not usually visible to the naked eye. They are a popular choice for engagement rings because they offer a balance between quality and value.</p>
        <p><strong>K, L, M:</strong> Faint yellow. These diamonds have a noticeable yellow tint, especially when viewed from the side. They are generally less expensive than higher color grades.</p>
        <div class="guide-scale-row">
          <div class="guide-scale-group">
            <span class="guide-scale-label">Faintly Coloured</span>
            <div class="guide-scale-icons">${["K", "J"].map((l) => DIAMOND_ICON(l, "#e9d5b0")).join("")}</div>
          </div>
          <div class="guide-scale-group">
            <span class="guide-scale-label">Nearly Colourless</span>
            <div class="guide-scale-icons">${["I", "H", "G"].map((l) => DIAMOND_ICON(l, "#f2e6cc")).join("")}</div>
          </div>
          <div class="guide-scale-group">
            <span class="guide-scale-label">Colourless</span>
            <div class="guide-scale-icons">${["F", "E", "D"].map((l) => DIAMOND_ICON(l, "#fbf8f1")).join("")}</div>
          </div>
        </div>

        <h5 class="guide-subhead">Diamond Clarity</h5>
        <p><strong>Flawless (FL) and Internally Flawless (IF):</strong> Diamonds with no visible inclusions or blemishes under 10x magnification, making them very rare and valuable.</p>
        <p><strong>Very, Very Slightly Included (VVS1 and VVS2):</strong> Diamonds with tiny inclusions that are difficult to see under 10x magnification, making them very high quality and valuable.</p>
        <p><strong>Very Slightly Included (VS1 and VS2):</strong> Diamonds with small inclusions that are visible under 10x magnification, but are not usually visible to the naked eye. These diamonds offer a good balance of quality and value.</p>
        <p><strong>Slightly Included (SI1 and SI2):</strong> Diamonds with noticeable inclusions that are easily visible under 10x magnification, and may be visible to the naked eye. These diamonds can be a good value for those who want a larger diamond at a lower cost.</p>
        <p><strong>Included (I1, I2, and I3):</strong> Diamonds with obvious inclusions that are visible to the naked eye and can affect the diamond's beauty and durability. These diamonds are generally less expensive.</p>
        <div class="guide-scale-row guide-clarity-row">
          <div class="guide-scale-group">
            <span class="guide-scale-label">Slightly Included</span>
            <div class="guide-scale-icons">${DIAMOND_ICON("SI1", "#e9d5b0")}</div>
          </div>
          <div class="guide-scale-group">
            <span class="guide-scale-label">Very Slightly Included</span>
            <div class="guide-scale-icons">${["VS2", "VS1"].map((l) => DIAMOND_ICON(l, "#f2e6cc")).join("")}</div>
          </div>
          <div class="guide-scale-group">
            <span class="guide-scale-label">Very Very Slightly Included</span>
            <div class="guide-scale-icons">${["VVS2", "VVS1"].map((l) => DIAMOND_ICON(l, "#f8f2e4")).join("")}</div>
          </div>
          <div class="guide-scale-group">
            <span class="guide-scale-label">Flawless</span>
            <div class="guide-scale-icons">${["IF", "FL"].map((l) => DIAMOND_ICON(l, "#fbf8f1")).join("")}</div>
          </div>
        </div>

        <p class="guide-note">In summary, the key difference between I-J-SI and I-SI1 (solitaire) and F-G-VVS and F-VVS2 (solitaire) is that the latter offers a higher level of quality and precision in both colour and clarity.</p>

        <h5 class="guide-subhead">Our Jewellery Certification Partners</h5>
        <div class="guide-cert-row">
          <div class="guide-cert-badge">IGI</div>
          <div class="guide-cert-badge">GIA</div>
          <div class="guide-cert-badge">SGL</div>
        </div>
        <p>All our Solitaires are natural and graded as per GIA (Gemological Institute of America) standards or IGI (International Gemological Institution).</p>
        <p>We have the best source for diamonds and all our diamonds are sorted and graded for their consistency, and the final product is certified by a third-party laboratory like SGL for its authenticity.</p>
      `,
    },
    size: {
      title: "RING SIZING GUIDE",
      body: `
        <div class="guide-option-row">
          <div class="guide-option-col">
            <span class="guide-option-tag">Option 1</span>
            <h5>Measuring an existing ring</h5>
            <ol>
              <li>Select an existing ring that fits the desired finger.</li>
              <li>Measure the internal diameter of the ring (in mm).</li>
              <li>Use the below chart to determine your size.</li>
            </ol>
            <div class="guide-ring-illustration" aria-hidden="true">
              <svg width="90" height="90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="34" fill="none" stroke="var(--ink)" stroke-width="6"/>
                <line x1="16" y1="50" x2="84" y2="50" stroke="var(--ink)" stroke-width="1"/>
                <line x1="16" y1="46" x2="16" y2="54" stroke="var(--ink)" stroke-width="1"/>
                <line x1="84" y1="46" x2="84" y2="54" stroke="var(--ink)" stroke-width="1"/>
              </svg>
              <span>20mm</span>
            </div>
            <div class="guide-table-wrap">
              <table class="guide-table">
                <tr><th>RING SIZE</th><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>
                <tr><th>Internal Diameter (mm)</th><td>15.6</td><td>15.9</td><td>16.2</td><td>16.5</td><td>16.8</td><td>17.2</td><td>17.5</td></tr>
              </table>
            </div>
          </div>

          <div class="guide-option-col">
            <span class="guide-option-tag">Option 2</span>
            <h5>Measure your finger</h5>
            <ol>
              <li>Wrap a strip of paper around your finger where you'd like your ring to be.</li>
              <li>Make sure the paper is pulled snug to your finger — the tighter the better — to find your best fit.</li>
              <li>Mark the spot where the paper meets and measure the distance with a ruler (mm).</li>
              <li>The measured distance (mm) is the circumference of your ring; use the below chart to know your ring size.</li>
            </ol>
            <div class="guide-table-wrap">
              <table class="guide-table">
                <tr><th>RING SIZE</th><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>
                <tr><th>Circumference (mm)</th><td>49</td><td>50.0</td><td>50.9</td><td>51.8</td><td>52.8</td><td>54.0</td><td>55</td></tr>
              </table>
            </div>
          </div>
        </div>

        <div class="guide-option-row guide-notes-row">
          <div class="guide-option-col">
            <h5>Determining what OrenkaFine ring you should order</h5>
            <p>Narrow / band rings should fit snugly at the base of the finger but also wide enough to fit the widest part of the finger (e.g. the knuckle).</p>
            <p>Wide Rings (6mm+ wide) should be worn a bit looser than narrow / band rings. It's recommended to add one size to accommodate the extra width.</p>
            <p><strong>Please note:</strong> if your knuckle is larger than the base of your finger —</p>
            <ul>
              <li>Measure your knuckle size</li>
              <li>Measure your ring size, i.e. the base of the finger</li>
              <li>Pick a size between the two</li>
            </ul>
          </div>
          <div class="guide-option-col">
            <h5>A few notes to consider</h5>
            <ol>
              <li>Measure your fingers at the end of the day when they're at their largest.</li>
              <li>Cold weather can shrink your fingers up to half a size, so make sure they're warm.</li>
              <li>Alcohol and salt can make your fingers swell, so refrain from measuring them after cocktails and appetizers.</li>
            </ol>
          </div>
        </div>
      `,
    },
    necklace: {
      title: "NECKLACE SIZING GUIDE",
      body: `
        <p class="guide-lead">To measure your desired necklace length, follow the below instructions:- Use a measuring tape or a regular ruler to measure the piece of string. You may also gauge where a necklace will fall by viewing our size chart.</p>
        <div class="guide-option-row guide-necklace-row">
          <div class="guide-option-col">
            <div class="guide-necklace-illustration" aria-hidden="true">
              <svg width="100%" height="220" viewBox="0 0 200 220">
                <ellipse cx="100" cy="34" rx="26" ry="30" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
                <path d="M62 74 C62 60 138 60 138 74 L156 210 L44 210 Z" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
                <path d="M70 78 Q100 108 130 78" fill="none" stroke="var(--gold)" stroke-width="1.3" stroke-dasharray="2 2"/>
                <text x="146" y="82" font-size="9" fill="var(--ink-soft)">15.5"</text>
                <path d="M68 78 Q100 122 132 78" fill="none" stroke="var(--gold)" stroke-width="1.3" stroke-dasharray="2 2"/>
                <text x="150" y="122" font-size="9" fill="var(--ink-soft)">16.5"</text>
                <path d="M66 78 Q100 138 134 78" fill="none" stroke="var(--gold)" stroke-width="1.3" stroke-dasharray="2 2"/>
                <text x="154" y="140" font-size="9" fill="var(--ink-soft)">17.5"</text>
              </svg>
            </div>
          </div>
          <div class="guide-option-col">
            <div class="guide-table-wrap">
              <table class="guide-table guide-table-vertical">
                <tr><th>ORDER SIZE</th><td>15.5"</td><td>16.5"</td><td>17.5"</td></tr>
                <tr><th>Chain size (inches)</th><td>15.5" (Adjustable from 14.5"-16.5")</td><td>16.5" (Adjustable from 15.5"-17.5")</td><td>17.5" (Adjustable from 16.5"-18.5")</td></tr>
                <tr><th>Chain size (centimeters)</th><td>39.37</td><td>41.91</td><td>44.45</td></tr>
              </table>
            </div>
            <p class="guide-note"><strong>Kindly note:</strong> The necklace is secured by a spring ring which allows you to adjust the length by 1" +/- of the ordered size.</p>
          </div>
        </div>
      `,
    },
    bangle: {
      title: "BANGLE SIZING GUIDE",
      body: `
        <h5 class="guide-subhead" style="margin-top:0 !important; padding-top:0; border-top:none;">Measuring your wrist with tape</h5>
        <div class="guide-wrist-illustration" aria-hidden="true">
          <svg width="140" height="120" viewBox="0 0 140 120">
            <path d="M20 20 C10 40 10 60 26 78 C34 88 46 92 58 90 L96 84 C110 82 118 70 116 56 C114 44 102 38 90 40 L60 46" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
            <path d="M18 40 C30 30 44 26 58 30" fill="none" stroke="#c0554a" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/>
          </svg>
        </div>
        <div class="guide-aani-grid">
          ${[
            ["2.0 AANI (14.90 cm)", "For Wrist Size - 14 cm", "44.0 mm", "50.7 mm"],
            ["2.1 AANI (15.35 cm)", "For Wrist Size - 14.5 cm", "45.4 mm", "52.3 mm"],
            ["2.2 AANI (15.85 cm)", "For Wrist Size - 15 cm", "46.8 mm", "53.9 mm"],
            ["2.3 AANI (16.30 cm)", "For Wrist Size - 15.5 cm", "48.2 mm", "55.5 mm"],
            ["2.4 AANI (16.75 cm)", "For Wrist Size - 16 cm", "49.6 mm", "57.1 mm"],
            ["2.5 AANI (17.25 cm)", "For Wrist Size - 16.5 cm", "51.0 mm", "58.7 mm"],
          ].map(([title, sub, h, w]) => `
            <div class="guide-aani-card">
              <strong>${title}</strong>
              <span>${sub}</span>
              <svg width="90" height="90" viewBox="0 0 100 100" aria-hidden="true">
                <ellipse cx="50" cy="50" rx="38" ry="30" fill="none" stroke="var(--ink)" stroke-width="4"/>
                <line x1="50" y1="14" x2="50" y2="86" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="2 2"/>
                <line x1="8" y1="50" x2="92" y2="50" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="2 2"/>
              </svg>
              <div class="guide-aani-dims"><span>${h}</span><span>${w}</span></div>
            </div>
          `).join("")}
        </div>

        <div class="guide-option-row">
          <div class="guide-option-col">
            <span class="guide-option-tag">Option 1</span>
            <h5>Measuring your existing bangle</h5>
            <p>Measure the inner diameter of a bangle you own. Using the following chart, determine your bangle size.</p>
            <div class="guide-table-wrap">
              <table class="guide-table">
                <tr><th>BANGLE SIZE (anna)</th><td>2-4</td><td>2-5</td><td>2-6</td></tr>
                <tr><th>Diameter (mm)</th><td>57.20</td><td>58.70</td><td>60.30</td></tr>
              </table>
            </div>
            <div class="guide-ring-illustration" aria-hidden="true">
              <svg width="80" height="80" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="34" fill="none" stroke="var(--ink)" stroke-width="6"/>
              </svg>
              <span>2.6 Anna &middot; 60.30mm</span>
            </div>
          </div>

          <div class="guide-option-col">
            <span class="guide-option-tag">Option 2</span>
            <h5>Measuring your wrist with a measuring tape</h5>
            <p>To determine your bangle size, simply tuck your thumb into the palm of your hand (as if about to put on a bangle) and use a measuring tape or a ribbon.</p>
            <ol>
              <li>Measure your hand all the way around the set of knuckles closest to your wrist, knuckle to knuckle. Be sure to pull the ribbon or measuring tape snug against your skin. Mark the ribbon with a pen and measure it with a ruler.</li>
              <li>Use the following chart to determine your bangle size.</li>
            </ol>
            <div class="guide-table-wrap">
              <table class="guide-table">
                <tr><th>Bangle size (anna)</th><td>2-4</td><td>2-5</td><td>2-6</td></tr>
                <tr><th>Circumference (mm)</th><td>179.6</td><td>184</td><td>189.5</td></tr>
                <tr><th>Circumference (inch)</th><td>7.06</td><td>7.25</td><td>7.46</td></tr>
              </table>
            </div>
          </div>
        </div>

        <h5 class="guide-subhead">A few notes to consider</h5>
        <ol>
          <li>Measure your wrist at the end of the day when they're at their largest.</li>
          <li>Cold weather can shrink your wrist, so make sure they're warm.</li>
          <li>Alcohol and salt can make your wrist swell, so refrain from measuring after cocktails and appetizers.</li>
        </ol>
      `,
    },
    bracelet: {
      title: "BRACELET SIZING GUIDE",
      body: `
        <div class="guide-option-row">
          <div class="guide-option-col">
            <span class="guide-option-tag">Option 1</span>
            <h5>Measuring your wrist with measuring tape</h5>
            <p>To find your perfect bracelet size, follow these steps:-</p>
            <ol>
              <li>Measure your wrist with a flexible tape measuring tape or a ribbon just below the wrist bone, where you would normally wear the bracelet.</li>
              <li>If using a plain ribbon, mark the meeting point where it overlaps to form a full circle with a pen or pencil, then use a ruler to measure the length. That would be your wrist size.</li>
              <li>To find your bracelet size, just add your wrist size with the appropriate FITTING STYLE measurement below. E.g. if your wrist measures 5.5" and you want a snug fit, just add 1/2" and your bracelet size would be a SIZE 6.</li>
            </ol>
          </div>
          <div class="guide-option-col">
            <h5>A few notes to consider:-</h5>
            <ol>
              <li>Measure your wrist at the end of the day when they're at their largest.</li>
              <li>Cold weather can shrink your wrist, so make sure they're warm.</li>
            </ol>
            <p>Do you want a snug or loose fit? Well, that really varies between each individual. If you are buying a delicate bracelet with a thin chain, we suggest doing a snug fit. Most other bracelets should be worn as a comfort fit.</p>
            <p class="guide-note">
              <strong>FITTING STYLE</strong> (add inches to your wrist size)<br><br>
              <strong>Snug Fit</strong> &mdash; Add 1/4" to 1/2"<br>
              <strong>Comfort Fit</strong> &mdash; Add 3/4" to 1"<br>
              <strong>Loose Fit</strong> &mdash; Add 1 1/4"
            </p>
          </div>
        </div>

        <h5 class="guide-subhead">Measuring your wrist with ribbon</h5>
        <div class="guide-option-row guide-necklace-row">
          <div class="guide-option-col">
            <div class="guide-wrist-illustration" aria-hidden="true">
              <svg width="150" height="120" viewBox="0 0 150 120">
                <path d="M22 18 C10 40 10 62 28 80 C36 90 48 94 60 92 L100 86 C114 84 122 72 120 58 C118 46 106 40 94 42 L62 48" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
                <path d="M20 42 C34 30 50 26 64 30" fill="none" stroke="#c0554a" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/>
              </svg>
              <svg width="150" height="70" viewBox="0 0 150 70">
                <path d="M20 50 C30 20 60 10 90 20" fill="none" stroke="var(--ink)" stroke-width="1.2"/>
                <line x1="90" y1="50" x2="140" y2="50" stroke="var(--ink)" stroke-width="1"/>
                <line x1="90" y1="46" x2="90" y2="54" stroke="var(--ink)" stroke-width="1"/>
                <line x1="140" y1="46" x2="140" y2="54" stroke="var(--ink)" stroke-width="1"/>
              </svg>
            </div>
          </div>
          <div class="guide-option-col">
            <div class="guide-table-wrap">
              <table class="guide-table guide-table-vertical">
                <tr><th>ORDER SIZE</th><td>Size 6</td><td>Size 7</td><td>Size 8</td></tr>
                <tr><th>Chain size (inches)</th><td>6" (Adjustable from 5.5"-6.5")</td><td>7" (Adjustable from 6.5"-7.5")</td><td>8" (Adjustable from 7.5"-8.5")</td></tr>
                <tr><th>Chain size (mm)</th><td>152.4</td><td>177.8</td><td>203.2</td></tr>
              </table>
            </div>
          </div>
        </div>
      `,
    },
  };

  function close() {
    const wrap = document.querySelector(".guide-modal-backdrop");
    if (!wrap) return;
    wrap.classList.add("closing");
    document.removeEventListener("keydown", onKeydown);
    setTimeout(() => {
      wrap.remove();
      document.body.classList.remove("guide-modal-open");
    }, 220);
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  function open(type) {
    const data = CONTENT[type];
    if (!data) return;
    close();

    const wrap = document.createElement("div");
    wrap.className = "guide-modal-backdrop";
    wrap.innerHTML = `
      <div class="guide-modal" role="dialog" aria-modal="true" aria-label="${data.title}">
        <div class="guide-modal-head">
          <h3>${data.title}</h3>
          <button type="button" class="guide-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="guide-modal-body">${data.body}</div>
      </div>
    `;
    document.body.appendChild(wrap);
    document.body.classList.add("guide-modal-open");

    wrap.querySelector(".guide-modal-close").addEventListener("click", close);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close();
    });
    document.addEventListener("keydown", onKeydown);
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-guide]");
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.guide);
  });

  window.openGuideModal = open;
})();
