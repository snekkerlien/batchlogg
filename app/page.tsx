import type { Metadata } from "next";
import Link from "next/link";
import HomeAuthActions from "./HomeAuthActions";

export const metadata: Metadata = {
  title: "Batchlogg — Brewing workspace",
  description:
    "Track brewing batches, refine recipes, manage inventory, calculate ABV, and connect with other brewers using Batchlogg.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[...Array(25)].map((_, index) => (
          <span
            key={index}
            className="bubble"
            style={{
              left: `${(index * 37) % 100}%`,
              animationDuration: `${3 + (index % 5)}s`,
              animationDelay: `${(index % 4) * 0.6}s`,
              width: `${4 + (index % 3) * 3}px`,
              height: `${4 + (index % 3) * 3}px`,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 w-full max-w-3xl space-y-6 rounded-xl border border-white/10 bg-black/40 p-10 text-center backdrop-blur-md">
        <h1 className="text-5xl font-bold">Batchlogg</h1>
        <p className="mx-auto max-w-2xl text-lg opacity-80">
          The complete brewing workspace for tracking batches, refining recipes,
          managing inventory, and connecting with the brewers around you.
        </p>
        <HomeAuthActions />
      </section>

      <section
        aria-labelledby="explore-heading"
        className="relative z-10 mt-10 w-full max-w-4xl rounded-xl border border-green-300/20 bg-black/50 p-6 backdrop-blur-md sm:p-8"
      >
        <div className="mb-6 text-center">
          <h2 id="explore-heading" className="text-2xl font-bold text-green-300 sm:text-3xl">
            Explore Batchlogg — no account needed
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/75">
            Try the brewing tools, browse recipes people have chosen to share,
            and see what the community is discussing. Sign in only when you want
            to join in or manage your own brewing.
          </p>
        </div>
        <ul className="public-explore-grid grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/recipes"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">Public brewing recipes</h3>
              <p className="mt-2 text-sm text-white/70">
                Browse recipes their brewers have chosen to share publicly.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                Browse recipes →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/abv-tools"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">Brewing calculators</h3>
              <p className="mt-2 text-sm text-white/70">
                Calculate ABV, dilution, target strength, original gravity, and
                sugar or honey requirements.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                Open ABV tools →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/community/forum"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">Community forum</h3>
              <p className="mt-2 text-sm text-white/70">
                Read brewing discussions without signing in. Create a free
                account to post or reply.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                Explore discussions →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">Questions and feedback</h3>
              <p className="mt-2 text-sm text-white/70">
                Find the right way to get in touch, with or without a Batchlogg
                account.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                Contact Batchlogg →
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="relative z-10 mt-12 w-full max-w-4xl rounded-xl border border-white/10 bg-black/30 p-6 text-center backdrop-blur-md sm:p-8">
        <h2 className="text-2xl font-bold text-green-300 sm:text-3xl">
          Plan a brew. Track every step. Improve the next.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-white/75">
          Keep your recipes, batches, and brewing notes together so every brew
          is easier to manage and learn from.
        </p>
        <ul className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          <li className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-green-200">Plan</h3>
            <p className="mt-2 text-sm text-white/70">
              Build recipes and keep your ingredients ready for brew day.
            </p>
          </li>
          <li className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-green-200">Brew</h3>
            <p className="mt-2 text-sm text-white/70">
              Track vessels, fermentation stages, measurements, and notes.
            </p>
          </li>
          <li className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-green-200">Improve</h3>
            <p className="mt-2 text-sm text-white/70">
              Revisit batch history and use what you learned in your next recipe.
            </p>
          </li>
        </ul>
      </section>

    </main>
  );
}
