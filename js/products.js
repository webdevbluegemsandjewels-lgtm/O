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
		brand: i < 25 ? "OrenkaFine Jewelry" : "OrenkaFine Moda",
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
		brand: i < 25 ? "OrenkaFine Jewelry" : "OrenkaFine Moda",
		cat: "Bracelets",
		price: `₹${amount}`,
		image: `products/braclet/${imageIndex}.png`,
		secondaryImage: `products/braclet/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} bracelet design in premium finish`
	};
});

const NECKLACE_STYLES = [
	"Aurelia", "Lariat", "Choker", "Pendant", "Layered", "Pearl Drop", "Halo", "Seraph", "Glide", "Velvet",
	"Orbit", "Dawn", "Muse", "Twilight", "Celeste", "Nova", "Bloom", "Cascade", "Etoile", "Gleam",
	"Harmony", "Opaline", "Solace", "Lustre", "Stella"
];

const NECKLACES = Array.from({ length: 50 }, (_, i) => {
	const imageIndex = (i % 10) + 1;
	const secondaryIndex = ((i + 5) % 10) + 1;
	const style = NECKLACE_STYLES[i % NECKLACE_STYLES.length];
	const necklaceNo = String(i + 1).padStart(2, "0");
	const amount = 180 + (i * 10);

	return {
		name: `Necklace ${necklaceNo} ${style}`,
		brand: i < 25 ? "OrenkaFine Jewelry" : "OrenkaFine Moda",
		cat: "Necklaces",
		price: `₹${amount}`,
		image: `products/necklacs/${imageIndex}.png`,
		secondaryImage: `products/necklacs/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} necklace design in premium finish`
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
		brand: i < 25 ? "OrenkaFine Jewelry" : "OrenkaFine Moda",
		cat: "Earrings",
		price: `₹${amount}`,
		image: `products/earring/${imageIndex}.png`,
		secondaryImage: `products/earring/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} earring design in premium finish`
	};
});

const EAR_CUFF_STYLES = [
	"Arc", "Twist", "Luna", "Spark", "Ribbon", "Petal", "Halo", "Glow", "Nova", "Whisper",
	"Glimmer", "Muse", "Stellar", "Chic", "Vibe", "Drape", "Sculpt", "Shine", "Bloom", "Eclipse",
	"Aster", "Poise", "Dazzle", "Breeze", "Aura"
];

const EAR_CUFFS = Array.from({ length: 50 }, (_, i) => {
	const imageIndex = (i % 10) + 1;
	const secondaryIndex = ((i + 6) % 10) + 1;
	const style = EAR_CUFF_STYLES[i % EAR_CUFF_STYLES.length];
	const cuffNo = String(i + 1).padStart(2, "0");
	const amount = 95 + (i * 6);

	return {
		name: `Ear Cuff ${cuffNo} ${style}`,
		brand: i < 25 ? "OrenkaFine Jewelry" : "OrenkaFine Moda",
		cat: "Ear Cuffs",
		price: `₹${amount}`,
		image: `products/ear-cuffs/${imageIndex}.png`,
		secondaryImage: `products/ear-cuffs/${secondaryIndex}.png`,
		tag: i < 5 ? "New" : "",
		lookup: "",
		description: `${style} ear cuff design in premium finish`
	};
});

PRODUCTS.push(...BRACELETS, ...NECKLACES, ...EARRINGS, ...EAR_CUFFS);

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

	// Material label (used in the sidebar filter)
	p.material = "18 karat gold";

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
	necklaceSet:    "https://images.unsplash.com/photo-1747933509433-c58152c10ee7",
	earringsHoop:   "https://images.unsplash.com/photo-1616121341778-0dd435d03d23",
	braceletWrist:  "https://images.unsplash.com/photo-1705575518997-82a71bcc75a2",
	heartNecklace:  "https://images.unsplash.com/photo-1620135104013-1abdff4b1ca7",
	dolceRing:      "https://images.unsplash.com/photo-1615146037533-0a9877176eb2",
	eternaBridal:   "https://images.unsplash.com/photo-1768932080519-3ebd5a81d090",
	everydayGold:   "https://images.unsplash.com/photo-1593193611972-437ce4d601c6",
};

function img(key, w = 900, extra = "") {
	return `${IMG[key]}?auto=format&fit=crop&w=${w}&q=80${extra}`;
}

const COLLECTIONS = [
	{ id: "Dolce", title: "Dolce Collection", tagline: "Inspired by Italian Summer", description: "Luminous diamonds and warm gold create pieces for wedding days, evenings, and everyday celebration.", image: img("dolceRing", 1200), href: "collections.html?collection=Dolce" },
	{ id: "Eterna", title: "Eterna Collection", tagline: "Wedding & Bridal", description: "Elegant engagement and bridal jewelry designed with diamonds that shine from every angle.", image: img("eternaBridal", 1200), href: "collections.html?collection=Eterna" },
	{ id: "Everyday Gold", title: "Everyday Gold", tagline: "Everyday elegance", description: "Lightweight diamond details designed to stack, layer, and carry you from day to night.", image: img("everydayGold", 1200), href: "collections.html?collection=Everyday+Gold" },
];

const CATEGORIES = [
	{ name: "Rings", image: img("ringModel", 500) },
	{ name: "Necklaces", image: img("necklaceSet", 500) },
	{ name: "Earrings", image: img("earringsHoop", 500) },
	{ name: "Bracelets", image: img("braceletWrist", 500) },
	{ name: "Pendants", image: img("heartNecklace", 500) },
];

