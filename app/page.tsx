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
        <ul className="grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/about"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">About Batchlogg</h3>
              <p className="mt-2 text-sm text-white/70">
                Learn how Batchlogg helps brewers organize recipes and follow
                each batch from brew day through fermentation.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                Learn about Batchlogg →
              </span>
            </Link>
          </li>
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
              href="/download-app"
              className="block h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-green-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <h3 className="text-lg font-semibold">Batchlogg for desktop</h3>
              <p className="mt-2 text-sm text-white/70">
                Learn about the desktop app and download the latest release.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-300">
                View desktop app →
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

      <div className="relative z-10 mt-20 max-w-4xl space-y-16">
        <section className="rounded-xl border border-white/10 bg-black/30 p-8 text-center backdrop-blur-md">
          <h2 className="mb-4 text-3xl font-bold text-green-300">What is Batchlogg?</h2>
          <p className="mx-auto mb-6 max-w-3xl text-lg opacity-90">
            Batchlogg is the all-in-one brewing companion for the modern brewer.
            It lets you manage vessels, log every batch, save and refine recipes,
            track ingredients and equipment, calculate ABV, and keep a searchable
            history of everything you brew.
          </p>
          <ul className="mt-10 space-y-3 text-lg opacity-90">
            <li>Track active, secondary, and finished batches from brew day to bottle</li>
            <li>Log gravity, dates, notes, photos, and brewer insights for every fermentation</li>
            <li>Save and revisit recipes, ingredients, and batch details across styles and seasons</li>
            <li>Explore public brewing recipes shared by the community</li>
            <li>Manage your inventory and keep tabs on what you have in stock</li>
            <li>Use ABV tools to estimate strength and plan your next brew</li>
            <li>Visit the community forum to swap tips, ask questions, and share brewing ideas</li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/30 p-8 text-center backdrop-blur-md">
          <h2 className="mb-4 text-3xl font-bold text-green-300">
            Everything in one brewing workspace
          </h2>
          <p className="mx-auto mb-6 max-w-3xl text-lg opacity-90">
            From the dashboard to the batch history, Batchlogg gives you a clear
            view of the full brewing process. Build a repeatable workflow, spot
            patterns in your results, and keep all your brewing data in one place
            instead of scattered across notes, spreadsheets, and messages.
          </p>
          <ul className="mt-10 space-y-3 text-lg opacity-90">
            <li>Dashboard overview for your brewing vessels and current batches</li>
            <li>Batch history that keeps your process searchable and easy to revisit</li>
            <li>A personal recipe library for building and improving your best brews</li>
            <li>Community forums, member profiles, friends, and direct messages</li>
            <li>A social brewing space where you can connect, follow brewers, and discuss ideas</li>
            <li>Flexible privacy settings so you can share what you want and keep the rest personal</li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/30 p-8 text-center backdrop-blur-md">
          <h2 className="mb-4 text-3xl font-bold">For brewers, by brewers</h2>
          <p className="mx-auto max-w-3xl text-lg opacity-90">
            Batchlogg is built for brewers who want more than a basic logbook.
            Whether you’re brewing small experimental batches or running a larger,
            more structured setup, the platform helps you stay organized, learn
            from each batch, and share your work with the wider brewing community.
          </p>
        </section>
      </div>

    </main>
  );
}
