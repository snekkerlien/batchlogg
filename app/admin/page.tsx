import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import Link from "next/link";
import BackButton from "../batch-history/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";

export default async function AdminPage() {
  const { supabase } = supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const role = await getMembershipRole(supabase, user);
  if (role === "member") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">This page is only available to administrators.</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute top-2 left-4 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute top-2 right-4 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
            Batchlogg
          </p>
          <h1 className="mt-3 text-4xl font-bold">Admin panel</h1>
          <p className="mt-3 text-white/70">
            Manage accounts, access, and community reports.
          </p>
        </header>

        <section aria-label="Admin tools" className="grid gap-5 md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:w-[calc(50%-0.625rem)] md:[&>*:last-child:nth-child(odd)]:justify-self-center">
          {hasPermission(role, "manage_users") && <Link
            href="/admin/users"
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-green-400/40 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-green-300">
                  Accounts
                </p>
                <h2 className="mt-2 text-2xl font-bold">Manage users</h2>
              </div>
              <span aria-hidden="true" className="text-2xl text-green-300 transition group-hover:translate-x-1">→</span>
            </div>
            <p className="mt-4 leading-relaxed text-white/70">
              Review accounts and update user details. Open a user to grant or remove keg management access.
            </p>
          </Link>}

          {hasPermission(role, "review_reports") && <Link
            href="/admin/community-reports"
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-green-400/40 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-green-300">
                  Moderation
                </p>
                <h2 className="mt-2 text-2xl font-bold">Community reports</h2>
              </div>
              <span aria-hidden="true" className="text-2xl text-green-300 transition group-hover:translate-x-1">→</span>
            </div>
            <p className="mt-4 leading-relaxed text-white/70">
              Review member reports, inspect reported content, and track moderation history.
            </p>
          </Link>}
          {hasPermission(role, "manage_changelog") && <Link
            href="/admin/content"
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-green-400/40 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-green-300">Site content</p><h2 className="mt-2 text-2xl font-bold">Updates & announcements</h2></div><span aria-hidden="true" className="text-2xl text-green-300 transition group-hover:translate-x-1">→</span></div>
            <p className="mt-4 leading-relaxed text-white/70">
              Publish release notes and time-bounded announcements for members.
            </p>
          </Link>}
          {hasPermission(role, "view_analytics") && <Link
            href="/admin/analytics"
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-green-400/40 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-green-300">Operations</p><h2 className="mt-2 text-2xl font-bold">Community analytics</h2></div><span aria-hidden="true" className="text-2xl text-green-300 transition group-hover:translate-x-1">→</span></div>
            <p className="mt-4 leading-relaxed text-white/70">
              View privacy-preserving account, brewing, and moderation totals.
            </p>
          </Link>}
          {hasPermission(role, "manage_users") && <Link
            href="/admin/feedback"
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-green-400/40 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-green-300">Members</p><h2 className="mt-2 text-2xl font-bold">Feedback &amp; suggestions</h2></div><span aria-hidden="true" className="text-2xl text-green-300 transition group-hover:translate-x-1">→</span></div>
            <p className="mt-4 leading-relaxed text-white/70">
              Read feedback, suggestions and bug reports sent in from settings.
            </p>
          </Link>}
        </section>

        <div className="mt-8 rounded-lg border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/60">
          Signed in as <span className="font-medium text-white/80">{user?.email}</span>
        </div>
      </div>
    </main>
  );
}
