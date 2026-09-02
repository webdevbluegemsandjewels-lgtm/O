/* =========================================================
   OrenkaFine — loads products from Supabase, reshaped to match
   the field names productCardHTML() in main.js expects
   (image, secondaryImage, oldPrice, cat, etc.)
   ========================================================= */

function mapDbProductToCard(row, detailPage, livePrice) {
  // livePrice (from get_live_product_prices(), see
  // supabase/2026-08-27_live_card_prices.sql) reflects the current
  // gold rate + pricing_settings, same formula product.html uses —
  // falls back to the row's stored price when not available (e.g.
  // gold_weight_grams not set on this product, or the RPC failed).
  const effectivePrice = livePrice != null ? livePrice : Number(row.price);
  const hasPrice = effectivePrice > 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand || "OrenkaFine jewellery",
    cat: row.category,
    price: hasPrice ? `₹${Math.round(effectivePrice).toLocaleString("en-IN")}` : "Contact Us",
    oldPrice: hasPrice && row.old_price ? `₹${Number(row.old_price).toLocaleString("en-IN")}` : null,
    discount: hasPrice && row.old_price
      ? `${Math.round((1 - effectivePrice / row.old_price) * 100)}%`
      : null,
    image: row.image,
    secondaryImage: row.secondary_image || row.image,
    tag: row.tag || "",
    rating: row.rating || null,
    goldType: row.gold_type || "9 karat gold",
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

// Live prices (get_live_product_prices(), see
// supabase/2026-08-27_live_card_prices.sql) for every active product
// in one call, keyed by product_id. Best-effort: an empty map here
// just means every card falls back to its stored products.price, same
// as before this existed (e.g. the RPC isn't deployed yet on this
// Supabase project).
async function loadLivePriceMap() {
  const map = {};
  const { data, error } = await supabaseClient.rpc("get_live_product_prices");
  if (error) {
    console.warn("Live product prices unavailable, using stored prices:", error.message);
    return map;
  }
  (data || []).forEach((row) => {
    map[row.product_id] = Number(row.final_price);
  });
  return map;
}

// Fetches ALL active products once. For a very large catalog you'd want
// pagination, but this is fine for a few hundred to a couple thousand rows.
async function loadProductsFromDB() {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  const livePrices = await loadLivePriceMap();

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

    all = all.concat(data.map((row) => mapDbProductToCard(row, undefined, livePrices[row.id])));
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