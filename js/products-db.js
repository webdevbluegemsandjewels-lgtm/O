/* =========================================================
   OrenkaFine — loads products from Supabase, reshaped to match
   the field names productCardHTML() in main.js expects
   (image, secondaryImage, oldPrice, cat, etc.)
   ========================================================= */

function mapDbProductToCard(row, detailPage) {
  const hasPrice = Number(row.price) > 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand || "OrenkaFine jewellery",
    cat: row.category,
    price: hasPrice ? `₹${Number(row.price).toLocaleString("en-IN")}` : "Contact Us",
    oldPrice: hasPrice && row.old_price ? `₹${Number(row.old_price).toLocaleString("en-IN")}` : null,
    discount: hasPrice && row.old_price
      ? `${Math.round((1 - row.price / row.old_price) * 100)}%`
      : null,
    image: row.image,
    secondaryImage: row.secondary_image || row.image,
    tag: row.tag || "",
    rating: row.rating || null,
    goldType: row.gold_type || "18 karat gold",
    material: row.material || null, // Baguette/Diamond/Emerald/etc. category, not gold karat — see supabase_schema.sql
    colors: row.colors || [],
    description: row.description || "",
    // Card links to product.html unless overridden — mens_products
    // rows link to product-men.html instead (see loadMensProductsFromDB).
    detailPage: detailPage || "product.html",
    // Men's-only filter facets (see supabase/seed_mens_filters.sql) —
    // undefined on women's `products` rows, which don't have these
    // columns; the || defaults keep mens-collection.html's filtering
    // code simple regardless of which table a card came from.
    style: row.style || null,
    metal: row.metal || null,
    stoneColor: row.stone_color || null,
    gemstone: row.gemstone || [],
    birthstoneMonth: row.birthstone_month || null,
    designElement: row.design_element || [],
    significance: row.significance || [],
    enamelColor: row.enamel_color || null,
    collectionLine: row.collection || null,
    division: row.division || null,
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

    all = all.concat(data.map((row) => mapDbProductToCard(row)));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

// Same shape/pagination as loadProductsFromDB(), but reads the
// dedicated men's catalog table (see supabase/mens_schema.sql) and
// tags every card so it links to product-men.html instead of
// product.html.
async function loadMensProductsFromDB() {
  const pageSize = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from("mens_products")
      .select("*")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to load men's products:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    all = all.concat(data.map((row) => mapDbProductToCard(row, "product-men.html")));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}