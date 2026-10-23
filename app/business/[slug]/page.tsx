import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasBreweryAccess } from "@/lib/brewery/access";
import { businessTypeLabel } from "@/lib/brewery/business";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

export const dynamic = "force-dynamic";

export default async function BreweryPublicPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { sort?: string | string[] };
}) {
  const requestedSort = Array.isArray(searchParams?.sort)
    ? searchParams.sort[0]
    : searchParams?.sort;
  const sortBy = requestedSort === "date" || requestedSort === "rating"
    ? requestedSort
    : "name";

  const { serviceRole } = supabaseServer();
  const { data: brewery, error } = await serviceRole
    .from("brewery_accounts")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) {
    console.error("Could not load public business page", error);
    throw new Error("Could not load business page.");
  }
  if (!brewery || !hasBreweryAccess(brewery)) notFound();

  const { data: products, error: productsError } = await serviceRole
    .from("brewery_products")
    .select("id, slug, name, category, description, product_url, image_url, style, abv, batch_size_l, ebc, ibu, package_size, availability, created_at")
    .eq("brewery_id", brewery.id)
    .eq("is_published", true);
  if (productsError) {
    console.error("Could not load brewery products", productsError);
    throw new Error("Could not load brewery products.");
  }
  const productIds = (products ?? []).map((product) => product.id);
  const { data: reviews, error: reviewsError } = productIds.length
    ? await serviceRole
        .from("brewery_product_reviews")
        .select("product_id, rating")
        .in("product_id", productIds)
        .eq("status", "published")
    : { data: [], error: null };
  if (reviewsError) {
    console.error("Could not load product ratings", reviewsError);
    throw new Error("Could not load product ratings.");
  }
  const ratingSummary = new Map<string, { total: number; count: number }>();
  for (const review of reviews ?? []) {
    const summary = ratingSummary.get(review.product_id) ?? { total: 0, count: 0 };
    summary.total += review.rating;
    summary.count += 1;
    ratingSummary.set(review.product_id, summary);
  }
  const sortedProducts = [...(products ?? [])].sort((a, b) => {
    if (sortBy === "date") {
      return Date.parse(b.created_at) - Date.parse(a.created_at) ||
        a.name.localeCompare(b.name);
    }
    if (sortBy === "rating") {
      const aSummary = ratingSummary.get(a.id);
      const bSummary = ratingSummary.get(b.id);
      const aRating = aSummary ? aSummary.total / aSummary.count : -1;
      const bRating = bSummary ? bSummary.total / bSummary.count : -1;
      return bRating - aRating || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
        <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        <div className="mb-8">
          {brewery.logo_url && <img src={brewery.logo_url} alt={`${brewery.name} logo`} className="mx-auto mb-5 h-28 max-w-full rounded-xl object-contain" />}
          <PageHeading title={brewery.name} subtitle={[businessTypeLabel(brewery.business_type, brewery.business_type_other), brewery.location].filter(Boolean).join(" · ")} />
          {brewery.description && <p className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-center leading-7 text-white/75">{brewery.description}</p>}
          {brewery.website_url && <p className="mt-4 text-center"><a href={brewery.website_url} target="_blank" rel="noreferrer" className="text-green-200 underline underline-offset-4">Visit website</a></p>}
        </div>
        <section aria-labelledby="brewery-products-heading">
          <h2 id="brewery-products-heading" className="mb-5 text-center text-2xl font-semibold text-green-200">Products</h2>
          {sortedProducts.length > 0 && (
            <form method="get" className="mb-5 flex flex-wrap items-end justify-end gap-3">
              <label htmlFor="product-sort" className="text-sm text-white/75">
                Sort by
                <select
                  id="product-sort"
                  name="sort"
                  defaultValue={sortBy}
                  className="ml-2 rounded-lg border border-white/20 bg-zinc-900 px-3 py-2 text-white"
                >
                  <option value="date">Date · newest first</option>
                  <option value="name">Name · A–Z</option>
                  <option value="rating">Rating · highest first</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Apply
              </button>
            </form>
          )}
          {!sortedProducts.length ? <p className="text-center text-white/60">No products have been published yet.</p> : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedProducts.map((product) => {
                const summary = ratingSummary.get(product.id);
                const kitSpecs = [
                  product.ebc != null ? `${Number(product.ebc).toLocaleString()} EBC` : null,
                  product.ibu != null ? `${Number(product.ibu).toLocaleString()} IBU` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <li key={product.id}>
                    <Link href={`/business/${brewery.slug}/${product.slug}`} className="block h-full overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-green-400/40 hover:bg-white/10">
                      {product.image_url && <img src={product.image_url} alt="" className="h-48 w-full bg-black/20 object-contain" />}
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-wider text-green-300">{product.category.replace("-", " ")}</p>
                        <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
                        {product.style && <p className="mt-1 text-sm text-white/55">{product.style}</p>}
                        {product.abv != null && <p className="mt-2 text-sm text-white/70">{product.category === "all-grain-kit" ? "Target " : ""}{Number(product.abv).toFixed(1)}% ABV</p>}
                        {product.category === "all-grain-kit" && product.batch_size_l != null && (
                          <p className="mt-1 text-sm text-white/60">
                            Batch size · {Number(product.batch_size_l).toLocaleString()} L
                          </p>
                        )}
                        {product.category === "all-grain-kit" && kitSpecs && (
                          <p className="mt-1 text-sm text-white/60">
                            {kitSpecs}
                          </p>
                        )}
                        {summary ? (
                          <p className="mt-2 text-sm text-amber-200" aria-label={`${(summary.total / summary.count).toFixed(1)} out of 5 from ${summary.count} reviews`}>
                            ★ {(summary.total / summary.count).toFixed(1)} <span className="text-white/55">({summary.count} review{summary.count === 1 ? "" : "s"})</span>
                          </p>
                        ) : <p className="mt-2 text-xs text-white/45">No reviews yet</p>}
                        {product.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{product.description}</p>}
                        <span className="mt-4 inline-block text-sm font-semibold text-green-200">Product details →</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
