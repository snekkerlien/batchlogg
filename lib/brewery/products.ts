import { normalizeOptionalUrl, slugifyBreweryValue } from "@/lib/brewery/access";

const CATEGORIES = [
  "all-grain-kit",
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
    batch_size_l: category === "all-grain-kit" ? batchSizeLiters : null,
    ebc: category === "all-grain-kit" ? ebc : null,
    ibu: category === "all-grain-kit" ? ibu : null,
    package_size: packageSize,
    availability,
    details,
    is_published: body.isPublished !== false,
  };
}
