import type { Metadata } from "next";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import ContactOptions from "./ContactOptions";

export const metadata: Metadata = {
  title: "Contact Batchlogg",
  description:
    "Find out how to contact Batchlogg with questions, feedback, or bug reports.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="flex min-h-screen justify-center px-6 py-12 text-white">
      <article className="h-fit w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="contact" />
        <header className="mx-auto mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-green-300">
            Contact Batchlogg
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/80">
            Questions, suggestions, and bug reports are welcome. Choose the
            option that fits your situation below.
          </p>
        </header>

        <div className="mx-auto max-w-2xl text-sm leading-7 text-white/80">
          <ContactOptions />
        </div>
      </article>
    </main>
  );
}
