import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasBreweryAccess } from "@/lib/brewery/access";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import BreweryProductReviews from "../../BreweryProductReviews";
import BreweryBeerMetrics from "../../BreweryBeerMetrics";
import BreweryProductLink from "../../BreweryProductLink";
import { isBeerKitProductCategory } from "@/lib/brewery/products";

export const dynamic = "force-dynamic";

const beverageCategories = ["beer", "cider", "mead", "wine", "spirits", "non-alcoholic"];

export default async function BreweryProductPage({
  params,
  searchParams,
}: {
  params: { slug: string; productSlug: string };
  searchParams?: { source?: string };
}) {
  const { serviceRole } = supabaseServer();
  const { data: brewery, error: breweryError } = await serviceRole
    .from("brewery_accounts")
    .select("id, name, slug, status, manual_access_granted_at, manual_access_expires_at, stripe_subscription_status")
    .eq("slug", params.slug)
    .eq("status", "approved")
    .maybeSingle();
  if (breweryError) {
    console.error("Could not load brewery for product page", breweryError);
    throw new Error("Could not load product page.");
  }
  if (!brewery || !hasBreweryAccess(brewery)) notFound();

  const { data: product, error } = await serviceRole
    .from("brewery_products")
    .select("id, slug, name, category, description, product_url, image_url, style, abv, batch_size_l, ebc, ibu, package_size, price, price_currency, details")
    .eq("brewery_id", brewery.id)
    .eq("slug", params.productSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("Could not load brewery product", error);
    throw new Error("Could not load product page.");
  }
  if (!product) notFound();

  const { data: reviews, error: reviewsError } = await serviceRole
    .from("brewery_product_reviews")
    .select("rating")
    .eq("product_id", product.id)
    .eq("status", "published");
  if (reviewsError) {
    console.error("Could not load product rating", reviewsError);
    throw new Error("Could not load product rating.");
  }
  const publishedReviews = reviews ?? [];
  const reviewCount = publishedReviews.length;
  const averageRating = reviewCount
    ? publishedReviews.reduce((total, review) => total + review.rating, 0) / reviewCount
    : null;
  const details = typeof product.details === "object" && product.details !== null
    ? product.details as Record<string, unknown>
    : {};
  const brewedBy = typeof details.brewed_by === "string" ? details.brewed_by.trim() : "";
  const qrSource = searchParams?.source === "qr";
  const productPath = `/business/${encodeURIComponent(params.slug)}/${encodeURIComponent(params.productSlug)}${qrSource ? "?source=qr" : ""}#product-reviews-heading`;
  const loginHref = `/auth/login?redirect=${encodeURIComponent(productPath)}`;

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
        <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        {product.image_url && <img src={product.image_url} alt="" className="mb-6 max-h-96 w-full rounded-xl bg-black/20 object-contain" />}
        <p className={`text-sm uppercase tracking-widest text-green-300${isBeerKitProductCategory(product.category) ? " text-center" : ""}`}>{product.category.replace(/-/g, " ")}</p>
        <PageHeading title={product.name} subtitle={brewery.name} />
        {averageRating !== null && (
          <div
            className="mt-2 text-center text-sm text-amber-200"
            aria-label={`Rated ${averageRating.toFixed(1)} out of 5 from ${reviewCount} review${reviewCount === 1 ? "" : "s"}`}
          >
            <span aria-hidden="true" className="block text-2xl">
              {"★".repeat(Math.round(averageRating))}
              {"☆".repeat(5 - Math.round(averageRating))}
            </span>
            <span className="mt-1 block">
              {averageRating.toFixed(1)} / 5 · {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {product.product_url && <p className="mt-3 text-center"><BreweryProductLink productId={product.id} href={product.product_url} /></p>}
        <dl className="my-6 flex flex-wrap justify-center gap-6 text-center text-sm">
          {product.style && <div><dt className="text-white/50">Style</dt><dd className="mt-1">{product.style}</dd></div>}
          {beverageCategories.includes(product.category) && brewedBy && <div><dt className="text-white/50">Brewed by</dt><dd className="mt-1">{brewedBy}</dd></div>}
          {product.abv != null && <div><dt className="text-white/50">{isBeerKitProductCategory(product.category) ? "Target ABV" : "ABV"}</dt><dd className="mt-1">{Number(product.abv).toFixed(1)}%</dd></div>}
          {product.batch_size_l != null && <div><dt className="text-white/50">Batch size</dt><dd className="mt-1">{Number(product.batch_size_l).toLocaleString()} L</dd></div>}
          {product.package_size && <div><dt className="text-white/50">Package</dt><dd className="mt-1">{product.package_size}</dd></div>}
          {product.price != null && product.price_currency && (
            <div>
              <dt className="text-white/50">Listed price</dt>
              <dd className="mt-1 text-lg font-semibold text-green-100">
                {product.price_currency} {Number(product.price).toFixed(2)}
              </dd>
            </div>
          )}
        </dl>
        {product.product_url && (
          <p className="mb-6 text-center text-xs text-white/50">
            Check the product page for current availability.
          </p>
        )}
        {product.price != null && (
          <p className="mb-6 text-center text-xs text-white/50">
            Price supplied by the business; check the product page for the latest price.
          </p>
        )}
        <BreweryBeerMetrics
          ebc={product.ebc}
          ibu={product.ibu}
        />
        {product.description && <p className="mx-auto max-w-3xl whitespace-pre-line text-center leading-7 text-white/75">{product.description}</p>}
        <BreweryProductReviews
          productId={product.id}
          qrSource={qrSource}
          loginHref={loginHref}
        />
      </div>
    </main>
  );
}
