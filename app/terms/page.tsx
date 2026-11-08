"use client";

import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import IssueTrackerLink from "@/app/components/IssueTrackerLink";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">
        <PublicPageNavigation />

        <PageHeading
          title={t("Terms of Service")}
          subtitle={t("The rules and conditions for using Batchlogg.")}
        />

        {/* INTRODUCTION */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("1. Introduction")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("These terms of service govern your access to and use of Batchlogg, including all features, tools, and services provided through the platform. By creating an account or using Batchlogg, you agree to be bound by these terms.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("If you do not agree to these terms, you must discontinue use of the service immediately.")}
          </p>
        </section>

        {/* ACCOUNT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("2. Account Registration & Responsibilities")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("To use Batchlogg, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activities performed under your account.")}
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>{t("Do not share your password with others.")}</p>
            <p>{t("Do not use another person’s account without permission.")}</p>
            <p>{t("Do not create accounts using false or misleading information.")}</p>
            <p>{t("Do not attempt to bypass security or authentication systems.")}</p>
          </div>
        </section>

        {/* USER CONTENT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("3. User Content & Ownership")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("Batchlogg allows you to store brewing data, recipes, vessels, fermentation logs, and other content (“User Content”). You retain ownership of all User Content you upload.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("By using Batchlogg, you grant us a limited, non-exclusive license to store, process, and display your User Content solely for the purpose of operating the service.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("You agree not to upload content that is harmful, illegal, abusive, or violates the rights of others.")}
          </p>
        </section>

        {/* DATA HANDLING */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("4. Data Storage, Backups & Availability")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("Batchlogg stores your data securely and provides tools for exporting and restoring backups. However, we cannot guarantee that data will always be available, recoverable, or free from loss.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("You are responsible for maintaining your own backups using the export tools provided.")}
          </p>
        </section>

        {/* SERVICE USE */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("5. Acceptable Use Policy")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("You agree not to use Batchlogg in any way that could harm the service, other users, or the underlying infrastructure.")}
          </p>

          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>{t("Do not attempt to hack or exploit vulnerabilities.")}</p>
            <p>{t("Do not automate requests in a way that overloads the service.")}</p>
            <p>{t("Do not upload malware or malicious scripts.")}</p>
            <p>{t("Do not use Batchlogg for illegal activities.")}</p>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed mt-3">
            {t("Violations may result in suspension or permanent termination of your account.")}
          </p>
        </section>
        {/* SERVICE CHANGES */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("6. Changes, Updates & Feature Modifications")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("Batchlogg is an evolving service. Features may be added, modified, or removed at any time. We may also update the interface, improve performance, or adjust how certain tools work.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("We will make reasonable efforts to communicate major changes, but we are not obligated to provide advance notice for all updates.")}
          </p>
        </section>

        {/* TERMINATION */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("7. Account Suspension & Termination")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("We reserve the right to suspend or terminate accounts that violate these terms, engage in harmful behavior, or pose security risks.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("You may delete your account at any time using the tools provided in the Settings page. Deleting your account permanently removes your data and cannot be undone.")}
          </p>
        </section>

        {/* LIABILITY */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("8. Disclaimer of warranty & limitation of liability")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {t("Batchlogg is provided “as is” without warranties of any kind. We do not guarantee uninterrupted service, error-free operation, or complete data reliability.")}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("To the fullest extent permitted by law, Batchlogg is not liable for any damages, data loss, downtime, or issues arising from your use of the service.")}
          </p>
        </section>

        {/* CHANGES TO TERMS */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("9. Updates to these terms")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("We may update these terms periodically. Continued use of Batchlogg after changes are published means you accept the updated terms.")}
          </p>
        </section>

        {/* CONTACT */}
        <section className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-lg font-semibold text-green-300 mb-3">
            {t("10. Contact Information")}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t("For bug reports or non-sensitive questions about Batchlogg, use the public")}{" "}
            <IssueTrackerLink className="text-green-300 underline">
              {t("GitHub issue tracker")}
            </IssueTrackerLink>
            {t(". Do not post passwords, account details, or other private information there. Signed-in members can also send feedback from Settings.")}
          </p>
        </section>

      </div>
    </main>
  );
}
