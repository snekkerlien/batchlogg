import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasBreweryAccess } from "@/lib/brewery/access";
import { businessTypeLabel } from "@/lib/brewery/business";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

export const dynamic = "force-dynamic";

export default async function BreweriesPage() {
  const { serviceRole } = supabaseServer();
  const { data: accounts, error } = await serviceRole
    .from("brewery_accounts")
    .select("id, name, business_type, business_type_other, slug, description, location, logo_url, status, manual_access_granted_at, manual_access_expires_at, stripe_subscription_status")
    .eq("status", "approved")
    .order("name");
  if (error) {
    console.error("Could not load drinks directory", error);
  }

  const eligible = (accounts ?? []).filter((account) =>
    hasBreweryAccess(account)
  );

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
        <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        <PageHeading title="Beer & Brewing Reviews" subtitle="Discover and review beer kits, beverages, breweries, pubs, homebrew shops, and more." />
        <div className="mb-5 mt-3 text-center text-sm text-white/55">
          Own a brewing business?{" "}
          <Link
            href="/business/manage"
            className="font-semibold text-green-300 underline decoration-green-300/40 underline-offset-4 transition hover:text-green-200"
          >
            Register your business
          </Link>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/40 p-4 text-red-200">The drinks directory could not be loaded.</p>
        ) : eligible.length === 0 ? (
          <p className="text-center text-white/65">No pages are available yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {eligible.map((brewery, index) => {
              const centerLastCard =
                eligible.length % 2 === 1 && index === eligible.length - 1;

              return (
                <li key={brewery.id} className={centerLastCard ? "sm:col-span-2" : undefined}>
                  <Link
                    href={`/business/${brewery.slug}`}
                    className={`block h-full rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/40 hover:bg-white/10${centerLastCard ? " sm:mx-auto sm:max-w-[calc(50%_-_0.5rem)]" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      {brewery.logo_url && <img src={brewery.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-contain" />}
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-green-200">{brewery.name}</h2>
                        <p className="mt-1 text-sm text-white/60">{businessTypeLabel(brewery.business_type, brewery.business_type_other)}</p>
                        {brewery.location && <p className="mt-1 text-sm text-white/50">{brewery.location}</p>}
                      </div>
                    </div>
                    {brewery.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">{brewery.description}</p>}
                    <span className="mt-4 block text-center text-sm font-semibold text-green-200">Explore page →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
