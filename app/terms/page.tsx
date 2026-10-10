"use client";

import PageHeading from "@/app/components/PageHeading";
import MenuOverlay from "@/app/components/MenuOverlay";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-16">

        {/* Menu */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="terms" />
        </div>

        {/* Back button */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg"
            aria-label="Back to my account"
          >
            ←
          </button>
        </div>

        <PageHeading
          title="Terms of Service"
          subtitle="The rules and conditions for using Batchlogg."
        />

        {/* INTRODUCTION */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            1. Introduction
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            These Terms of Service (“Terms”) govern your access to and use of
            Batchlogg, including all features, tools, and services provided
            through the platform. By creating an account or using Batchlogg, you
            agree to be bound by these Terms.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            If you do not agree to these Terms, you must discontinue use of the
            service immediately.
          </p>
        </section>

        {/* ACCOUNT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            2. Account Registration & Responsibilities
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            To use Batchlogg, you must create an account with accurate and
            complete information. You are responsible for maintaining the
            confidentiality of your login credentials and for all activities
            performed under your account.
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>Do not share your password with others.</p>
            <p>Do not use another person’s account without permission.</p>
            <p>Do not create accounts using false or misleading information.</p>
            <p>Do not attempt to bypass security or authentication systems.</p>
          </div>
        </section>

        {/* USER CONTENT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            3. User Content & Ownership
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg allows you to store brewing data, recipes, vessels,
            fermentation logs, and other content (“User Content”). You retain
            ownership of all User Content you upload.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            By using Batchlogg, you grant us a limited, non-exclusive license to
            store, process, and display your User Content solely for the purpose
            of operating the service.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            You agree not to upload content that is harmful, illegal, abusive,
            or violates the rights of others.
          </p>
        </section>

        {/* DATA HANDLING */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            4. Data Storage, Backups & Availability
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg stores your data securely and provides tools for exporting
            and restoring backups. However, we cannot guarantee that data will
            always be available, recoverable, or free from loss.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            You are responsible for maintaining your own backups using the
            export tools provided.
          </p>
        </section>

        {/* SERVICE USE */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            5. Acceptable Use Policy
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            You agree not to use Batchlogg in any way that could harm the
            service, other users, or the underlying infrastructure.
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>Do not attempt to hack or exploit vulnerabilities.</p>
            <p>Do not automate requests in a way that overloads the service.</p>
            <p>Do not upload malware or malicious scripts.</p>
            <p>Do not use Batchlogg for illegal activities.</p>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed mt-3">
            Violations may result in suspension or permanent termination of your
            account.
          </p>
        </section>
        {/* SERVICE CHANGES */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            6. Changes, Updates & Feature Modifications
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg is an evolving service. Features may be added, modified,
            or removed at any time. We may also update the interface, improve
            performance, or adjust how certain tools work.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We will make reasonable efforts to communicate major changes, but we
            are not obligated to provide advance notice for all updates.
          </p>
        </section>

        {/* TERMINATION */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            7. Account Suspension & Termination
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            We reserve the right to suspend or terminate accounts that violate
            these Terms, engage in harmful behavior, or pose security risks.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            You may delete your account at any time using the tools provided in
            the Settings page. Deleting your account permanently removes your
            data and cannot be undone.
          </p>
        </section>

        {/* LIABILITY */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            8. Disclaimer of Warranty & Limitation of Liability
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg is provided “as is” without warranties of any kind. We do
            not guarantee uninterrupted service, error-free operation, or
            complete data reliability.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            To the fullest extent permitted by law, Batchlogg is not liable for
            any damages, data loss, downtime, or issues arising from your use of
            the service.
          </p>
        </section>

        {/* CHANGES TO TERMS */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            9. Updates to These Terms
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We may update these Terms periodically. Continued use of Batchlogg
            after changes are published means you accept the updated Terms.
          </p>
        </section>

        {/* CONTACT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            10. Contact Information
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            If you have questions about these Terms or Batchlogg in general,
            please reach out through the Feedback section in your account
            settings.
          </p>
        </section>

        <p className="text-sm opacity-40 mt-10 text-center">
          © {new Date().getFullYear()} Batchlogg
        </p>
      </div>
    </main>
  );
}
