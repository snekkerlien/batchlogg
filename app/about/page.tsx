import type { Metadata } from "next";
import Link from "next/link";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import packageJson from "../../package.json";

export const metadata: Metadata = {
  title: "About Batchlogg",
  description:
    "Learn about Batchlogg, a brewing workspace for tracking batches, recipes, ingredients, and brewing calculations.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="flex min-h-screen justify-center px-6 py-12 text-white">
      <article className="h-fit w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="about" />
        <header className="mx-auto mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-green-300">About Batchlogg</h1>
          <p className="mt-2 text-sm text-white/60">
            Current version: {packageJson.version}
          </p>
          <p className="mt-4 text-lg leading-8 text-white/80">
            Batchlogg is a brewing workspace for planning recipes, tracking
            batches from brew day to bottle, and learning from every result.
            Keep your brewing history in one place and make the next brew with
            more confidence.
          </p>
        </header>

        <div className="mx-auto max-w-2xl space-y-8 text-sm leading-7 text-white/80">
          <section aria-labelledby="workspace-heading" className="border-t border-white/10 pt-7">
            <h2
              id="workspace-heading"
              className="mb-5 text-xl font-semibold text-green-300"
            >
              Your brewing, all in one workspace
            </h2>
            <div className="grid gap-4 text-left sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-green-200">Plan your brew</h3>
                <p className="mt-2">
                  Create and refine recipes, keep track of ingredients and
                  equipment, and use brewing calculators to prepare your next
                  batch.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-green-200">Track each batch</h3>
                <p className="mt-2">
                  Manage vessels and follow fermentation with measurements,
                  dates, notes, and photos—from brew day through bottling.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-green-200">Learn as you go</h3>
                <p className="mt-2">
                  Revisit a searchable batch history, compare results, and use
                  what worked to make your recipes better next time.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-green-200">Share on your terms</h3>
                <p className="mt-2">
                  Browse public recipes and brewing discussions, while keeping
                  personal recipes and profile details private if you choose.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 pt-7">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              For brewers, by brewers
            </h2>
            <p>
              Batchlogg is built for brewers who want more than a basic logbook.
              Whether you’re brewing small experimental batches or running a
              larger, more structured setup, the platform helps you stay
              organized, learn from each batch, and share your work with the
              wider brewing community.
            </p>
          </section>

          <section className="border-t border-white/10 pt-7">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              A record you can learn from
            </h2>
            <p>
              A recipe is a plan. Each batch is the result of real ingredients,
              equipment, timing, and decisions. Keeping those details together
              makes it easier to compare attempts, remember what worked, and
              make deliberate changes instead of relying on memory.
            </p>
          </section>

          <section className="border-t border-white/10 pt-7">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              Sharing is your choice
            </h2>
            <p>
              Brewing notes can be personal. Batchlogg lets members decide
              whether a profile or recipe is public.
            </p>
            <p className="mt-1">
              Private records are not included in the public recipe directory.
              Visitors can explore recipes their brewers have chosen to share
              and join conversations in the{" "}
              <Link href="/community/forum" className="text-green-300 underline">
                community forum
              </Link>
              .
            </p>
          </section>

          <section className="border-t border-white/10 pt-7">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              An evolving project
            </h2>
            <p>
              Batchlogg is actively being developed. We continue to improve the
              experience as the project grows, and feedback from brewers helps
              shape what comes next.
            </p>
          </section>

          <section className="border-t border-white/10 pt-7">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              Questions and feedback
            </h2>
            <p>
              See the{" "}
              <Link href="/contact" className="text-green-300 underline">
                contact page
              </Link>{" "}
              for ways to ask a question or share feedback.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
