import { normalizeOptionalUrl, slugifyBreweryValue } from "@/lib/brewery/access";

const CATEGORIES = [
  "all-grain-kit",
  "fresh-wort-kit",
  "malt-extract-kit",
  "beer",
  "cider",
  "mead",
  "wine",
  "spirits",
  "non-alcoholic",
  "brewing-equipment",
  "brewing-ingredients",
  "merchandise",
  "other",
];
const AVAILABILITY = ["available", "seasonal", "discontinued"];
const BEVERAGE_CATEGORIES = ["beer", "cider", "mead", "wine", "spirits", "non-alcoholic"];
const BEER_KIT_CATEGORIES = ["all-grain-kit", "fresh-wort-kit", "malt-extract-kit"];

export function isBeverageProductCategory(category: string) {
  return BEVERAGE_CATEGORIES.includes(category);
}

export function isBeerKitProductCategory(category: string) {
  return BEER_KIT_CATEGORIES.includes(category);
}

export function validateBreweryProduct(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = body.category;
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const productUrl = normalizeOptionalUrl(body.productUrl);
  const style = body.style === "" ? null : body.style;
  const packageSize = body.packageSize === "" ? null : body.packageSize;
  const abv = body.abv === "" || body.abv === null ? null : Number(body.abv);
  const batchSizeLiters = body.batchSizeLiters === "" || body.batchSizeLiters == null
    ? null
    : Number(body.batchSizeLiters);
  const ebc = body.ebc === "" || body.ebc == null ? null : Number(body.ebc);
  const ibu = body.ibu === "" || body.ibu == null ? null : Number(body.ibu);
  const rawPrice =
    body.price === "" || body.price === null || body.price === undefined
      ? null
      : String(body.price).trim();
  const price = rawPrice === null ? null : Number(rawPrice);
  const priceCurrency =
    body.priceCurrency === "" || body.priceCurrency === null || body.priceCurrency === undefined
      ? null
      : typeof body.priceCurrency === "string"
        ? body.priceCurrency.trim().toUpperCase()
        : undefined;
  const availability = body.availability ?? "available";
  const details = body.details ?? {};
  if (
    !name ||
    name.length > 160 ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category) ||
    description.length > 5000 ||
    productUrl === undefined ||
    (style !== null && (typeof style !== "string" || style.length > 120)) ||
    (packageSize !== null && (typeof packageSize !== "string" || packageSize.length > 120)) ||
    (abv !== null && (!Number.isFinite(abv) || abv < 0 || abv > 100)) ||
    (batchSizeLiters !== null &&
      (!Number.isFinite(batchSizeLiters) || batchSizeLiters < 0 || batchSizeLiters > 10000)) ||
    (ebc !== null && (!Number.isFinite(ebc) || ebc < 0 || ebc > 1000)) ||
    (ibu !== null && (!Number.isFinite(ibu) || ibu < 0 || ibu > 1000)) ||
    (price !== null &&
      (!/^\d{1,10}(?:\.\d{1,2})?$/.test(rawPrice ?? "") ||
        !Number.isFinite(price) ||
        price < 0 ||
        price >= 10_000_000_000)) ||
    priceCurrency === undefined ||
    (priceCurrency !== null && !/^[A-Z]{3}$/.test(priceCurrency)) ||
    ((price === null) !== (priceCurrency === null)) ||
    typeof availability !== "string" ||
    !AVAILABILITY.includes(availability) ||
    typeof details !== "object" ||
    details === null ||
    Array.isArray(details)
  ) return null;

  const slug = slugifyBreweryValue(
    typeof body.slug === "string" && body.slug.trim() ? body.slug : name
  );
  if (!slug) return null;

  const imageUrl: string | null = normalizeOptionalUrl(null) ?? null;
  return {
    slug,
    name,
    category,
    description,
    product_url: productUrl,
    image_url: imageUrl,
    style,
    abv,
    batch_size_l: isBeerKitProductCategory(category) ? batchSizeLiters : null,
    ebc: isBeerKitProductCategory(category) ? ebc : null,
    ibu: isBeerKitProductCategory(category) ? ibu : null,
    package_size: packageSize,
    price,
    price_currency: priceCurrency,
    availability,
    details,
    is_published: body.isPublished !== false,
  };
}
