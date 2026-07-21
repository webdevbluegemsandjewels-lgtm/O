/* =========================================================
   OrenkaFine — loads products from Supabase, reshaped to match
   the field names productCardHTML() in main.js expects
   (image, secondaryImage, oldPrice, cat, etc.)
   ========================================================= */

function mapDbProductToCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand || "OrenkaFine jewellery",
    cat: row.category,
    price: `₹${Number(row.price).toLocaleString("en-IN")}`,
    oldPrice: row.old_price ? `₹${Number(row.old_price).toLocaleString("en-IN")}` : null,
    discount: row.old_price
      ? `${Math.round((1 - row.price / row.old_price) * 100)}%`
      : null,
    image: row.image,
    secondaryImage: row.secondary_image || row.image,
    tag: row.tag || "",
    rating: row.rating || null,
    material: row.material || "18 karat gold",
    colors: row.colors || [],
    description: row.description || "",
  };
}

// Fetches ALL active products once. For a very large catalog you'd want
// pagination, but this is fine for a few hundred to a couple thousand rows.
async function loadProductsFromDB() {
  const pageSize = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to load products:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    all = all.concat(data.map(mapDbProductToCard));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}