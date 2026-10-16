"use client";

import Link from "next/link";
import FeedbackForm from "@/app/(ui)/settings/FeedbackForm";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function ContactOptions() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <p className="border-t border-white/10 pt-7 text-sm text-white/70">
        Checking how you are signed in…
      </p>
    );
  }

  if (user) {
    return (
      <section className="border-t border-white/10 pt-7">
        <h2 className="mb-3 text-xl font-semibold text-green-300">
          Send us a message
        </h2>
        <p className="mb-4 text-sm leading-7 text-white/80">
          Choose a topic and include the details that will help us understand
          your question or feedback.
        </p>
        <FeedbackForm defaultOpen />
      </section>
    );
  }

  return (
    <div className="grid gap-5 text-left sm:grid-cols-2">
      <section className="flex flex-col rounded-xl border border-green-300/20 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-green-300">
          Send a question or report a problem
        </h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-white/75">
          Use the public Batchlogg GitHub issue tracker to ask a question,
          suggest an improvement, or describe a bug.
        </p>
        <a
          href="https://github.com/snekkerlien/batchlogg/issues"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-green-400/40 bg-green-700/50 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Open GitHub issue tracker
        </a>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-green-300">
          Help us understand the issue
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/75">
          <li>Say which page or feature you were using.</li>
          <li>Describe what you expected and what happened instead.</li>
          <li>Include the steps to reproduce a bug, if you can.</li>
        </ul>
      </section>

      <aside className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/75 sm:col-span-2">
        GitHub issues are public. Never include passwords, account details, or
        other private information. Have an account?{" "}
        <Link href="/auth/login" className="text-green-300 underline">
          Sign in
        </Link>{" "}
        and use Feedback in Settings to send a message associated with your
        account.
      </aside>
    </div>
  );
}
