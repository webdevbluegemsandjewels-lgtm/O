const RING_STYLES = [
	"Solitaire", "Halo", "Eternity", "Twist", "Floral", "Vintage", "Infinity", "Royal", "Minimal", "Sculpted",
	"Radiant", "Luxe", "Celeste", "Aurora", "Starlit", "Grace", "Regal", "Petal", "Nova", "Muse",
	"Heritage", "Crown", "Dewdrop", "Velvet", "Classic", "Contour", "Moonlight", "Signature", "Pearl", "Bloom",
	"Charm", "Empress", "Crystal", "Harmony", "Dazzle", "Poise", "Glimmer", "Silk", "Aura", "Gemline",
	"Pure", "Brilliant", "Serene", "Luminous", "Prime", "Aria", "Lotus", "Timeless", "Opal", "Stella"
];

const PRODUCTS = Array.from({ length: 50 }, (_, i) => {
	const imageIndex = (i % 10) + 1;
	const secondaryIndex = ((i + 3) % 10) + 1;
	const style = RING_STYLES[i];
	const ringNo = String(i + 1).padStart(2, "0");
	const amount = 120 + (i * 9);

	return {
		name: `Ring ${ringNo} ${style}`,
		brand: i < 25 ? "OrenkaFine jewellery" : "OrenkaFine Moda",
		cat: "Rings",
		price: `₹${amount}`,
		image: `products/rings/${imageIndex}.png`,
		secondaryImage: `products/rings/${secondaryIndex}.png`,
		tag: i < 8 ? "New" : "",
		lookup: "",
		description: `${style} ring design in premium finish`
	};
});

const BRACELET_STYLES = [
	"Luna", "Aster", "Tennis", "Bangle", "Charm", "Cuff", "Auric", "Twirl", "Gleam", "Nova",
	"Drape", "Pearline", "Vita", "Pulse", "Orbit", "Halo", "Velour", "Shine", "Duo", "Cascade",
	"Grace", "Bloom", "Radiance", "Eclipse", "Serenity"
];

const BRACELETS = Array.from({ length: 50 }, (_, i) => {
	const imageIndex = (i % 10) + 1;
	const secondaryIndex = ((i + 4) % 10) + 1;
	const style = BRACELET_STYLES[i % BRACELET_STYLES.length];
	const braceletNo = String(i + 1).padStart(2, "0");
	const amount = 150 + (i * 8);

	return {
		name: `Bracelet ${braceletNo} ${style}`,
		brand: i < 25 ? "OrenkaFine jewellery" : "OrenkaFine Moda",
		cat: "Bracelets",
		price: `₹${amount}`,
		image: `products/braclet/${imageIndex}.png`,
		secondaryImage: `products/braclet/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} bracelet design in premium finish`
	};
});

const EARRING_STYLES = [
	"Stud", "Hoop", "Drop", "Cluster", "Teardrop", "Twinkle", "Halo", "Bloom", "Luxe", "Comet",
	"Aurora", "Pearline", "Nova", "Dew", "Sway", "Orbit", "Flare", "Glint", "Muse", "Wisp",
	"Glimmer", "Velour", "Starlit", "Prism", "Etoile"
];

const EARRINGS = Array.from({ length: 50 }, (_, i) => {
	const imageIndex = (i % 10) + 1;
	const secondaryIndex = ((i + 2) % 10) + 1;
	const style = EARRING_STYLES[i % EARRING_STYLES.length];
	const earringNo = String(i + 1).padStart(2, "0");
	const amount = 110 + (i * 7);

	return {
		name: `Earring ${earringNo} ${style}`,
		brand: i < 25 ? "OrenkaFine jewellery" : "OrenkaFine Moda",
		cat: "Earrings",
		price: `₹${amount}`,
		image: `products/earring/${imageIndex}.png`,
		secondaryImage: `products/earring/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} earring design in premium finish`
	};
});

PRODUCTS.push(...BRACELETS, ...EARRINGS);

// Extra display data used by the new card + filter sidebar
const COLOR_SWATCHES = {
	"Rose Gold": "#caa593",
	"Yellow Gold": "#e6c78b",
	"White Gold": "#d9d9d9"
};

PRODUCTS.forEach((p, i) => {
	// Give each product 1-3 available colors
	const allColors = Object.keys(COLOR_SWATCHES);
	const colorCount = (i % 3) + 1;
	p.colors = allColors.slice(0, colorCount);

	// Gold karat/purity label (shown on the card, not the Material category filter)
	p.goldType = "9 karat gold";

	// Rating (only some products show it)
	p.rating = i % 4 === 0 ? (4.2 + (i % 8) * 0.1).toFixed(1) : null;

	// Occasional sale price (drives the ribbon + strikethrough)
	if (i % 5 === 0) {
		const base = parseInt(p.price.replace(/[^\d]/g, ""), 10);
		p.oldPrice = `₹${Math.round(base * 1.18)}`;
		p.discount = "15%";
	}
});

/* =========================================================
	 OrenkaFine — shared product & image data
	 ========================================================= */

const IMG = {
	ringModel:      "https://images.unsplash.com/photo-1762505464397-6abf1a645981",
	earringsHoop:   "https://images.unsplash.com/photo-1616121341778-0dd435d03d23",
	braceletWrist:  "https://images.unsplash.com/photo-1705575518997-82a71bcc75a2",
	dolceRing:      "https://images.unsplash.com/photo-1615146037533-0a9877176eb2",
	eternaBridal:   "https://images.unsplash.com/photo-1768932080519-3ebd5a81d090",
	everydayGold:   "https://images.unsplash.com/photo-1593193611972-437ce4d601c6",
};

function img(key, w = 900, extra = "") {
	return `${IMG[key]}?auto=format&fit=crop&w=${w}&q=80${extra}`;
}

const COLLECTIONS = [
	{ id: "Dolce", title: "Dolce Collection", tagline: "Inspired by Italian Summer", description: "Luminous diamonds and warm gold create pieces for wedding days, evenings, and everyday celebration.", image: img("dolceRing", 1200), href: "collections.html?collection=Dolce" },
	{ id: "Eterna", title: "Eterna Collection", tagline: "Wedding & Bridal", description: "Elegant engagement and bridal jewellery designed with diamonds that shine from every angle.", image: img("eternaBridal", 1200), href: "collections.html?collection=Eterna" },
	{ id: "Everyday Gold", title: "Everyday Gold", tagline: "Everyday elegance", description: "Lightweight diamond details designed to stack, layer, and carry you from day to night.", image: img("everydayGold", 1200), href: "collections.html?collection=Everyday+Gold" },
];

// `comingSoon: true` marks a category with no live products yet — the
// homepage tile shows a "Coming Soon" badge, and collections.html shows
// a "Coming Soon, explore our other products" state when it's selected.
const CATEGORIES = [
	{ name: "Rings", image: "Index/Products/ring.png", comingSoon: true },
	{ name: "Earrings", image: "Index/Products/earring.png" },
	{ name: "Bracelets", image: "Index/Products/bracelet.png" },
	{ name: "Pendants", image: "Index/Products/pendant.png" },
	{ name: "Charms", image: "Index/Products/charm.png", comingSoon: true },
];

