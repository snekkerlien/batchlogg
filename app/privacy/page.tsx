"use client";

import PageHeading from "@/app/components/PageHeading";
import MenuOverlay from "@/app/components/MenuOverlay";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-16">

        {/* Menu */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="privacy" />
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
          title="Privacy Policy"
          subtitle="How Batchlogg collects, stores, and protects your data."
        />

        {/* INTRO */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            1. Overview
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            This Privacy Policy explains how Batchlogg handles your personal
            information, brewing data, and account details. By using Batchlogg,
            you agree to the practices described here.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We are committed to protecting your privacy and keeping your data
            secure.
          </p>
        </section>

        {/* DATA WE COLLECT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            2. Information We Collect
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg collects information necessary to operate the service and
            provide brewing tools. This includes:
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>Your account details such as email and username.</p>
            <p>Your brewing data including batches, recipes, vessels, and logs.</p>
            <p>Technical information like device type and basic usage statistics.</p>
            <p>Optional feedback or messages you submit through the platform.</p>
          </div>
        </section>

        {/* HOW WE USE DATA */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            3. How Your Data Is Used
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            We use your data to operate Batchlogg, improve features, and ensure
            a smooth brewing experience.
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>To store and display your brewing records.</p>
            <p>To personalize your account settings and preferences.</p>
            <p>To maintain platform security and prevent abuse.</p>
            <p>To develop new features and improve existing ones.</p>
          </div>
        </section>

        {/* DATA STORAGE */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            4. Data Storage & Security
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Your data is stored securely using modern cloud infrastructure.
            Batchlogg takes reasonable measures to protect your information from
            unauthorized access, loss, or misuse.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            No system is completely immune to risks, but we continuously work to
            maintain a safe environment for your brewing data.
          </p>
        </section>
        {/* DATA SHARING */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            5. Data Sharing
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg does not sell your data. We only share information when it
            is necessary to operate the service or comply with legal
            requirements.
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>We may share data with trusted service providers who support the platform.</p>
            <p>We may disclose information if required by law or to protect Batchlogg.</p>
            <p>Your public profile is visible only if you enable it in settings.</p>
          </div>
        </section>

        {/* BACKUPS */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            6. Backups & Data Portability
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Batchlogg provides tools to export your data and restore backups.
            These tools allow you to maintain control over your brewing history.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            You are responsible for storing your exported backups safely.
          </p>
        </section>

        {/* ACCOUNT DELETION */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            7. Account Deletion
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            You may delete your account at any time through the Settings page.
            Deleting your account permanently removes your brewing data,
            recipes, vessels, and profile information.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            This action cannot be undone.
          </p>
        </section>

        {/* POLICY CHANGES */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            8. Changes to This Policy
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We may update this Privacy Policy from time to time. Continued use
            of Batchlogg after changes are published means you accept the
            updated policy.
          </p>
        </section>

        {/* CONTACT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            9. Contact Information
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            If you have questions about this Privacy Policy or how your data is
            handled, please reach out through the Feedback section in your
            account settings.
          </p>
        </section>

        <p className="text-sm opacity-40 mt-10 text-center">
          © {new Date().getFullYear()} Batchlogg
        </p>
      </div>
    </main>
  );
}
