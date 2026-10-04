import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  suggestion: "Suggestion",
  feedback: "Feedback",
  bug: "Bug report",
};

export default async function AdminFeedbackPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const role = authError ? "member" : await getMembershipRole(supabase, user);

  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  const { data: items, error } = await serviceRole
    .from("feedback")
    .select("id, user_id, username, email, category, message, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <Link
            href="/admin"
            aria-label="Back to admin"
            className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 transition hover:bg-white/20"
          >
            ←
          </Link>
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <PageHeading
          title="Feedback"
          subtitle="Suggestions and feedback sent in by members."
        />

        {error ? (
          <p className="text-center text-red-300">
            Could not load feedback: {error.message}
          </p>
        ) : !items || items.length === 0 ? (
          <p className="text-center text-white/60">No feedback yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 font-semibold text-green-300">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  <time className="text-white/50">
                    {new Date(item.created_at).toLocaleString("en-GB")}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap">{item.message}</p>
                <p className="mt-3 text-sm text-white/50">
                  From{" "}
                  {item.user_id ? (
                    <Link
                      href={`/admin/users/${item.user_id}`}
                      className="text-white/80 underline"
                    >
                      {item.username ?? item.email ?? item.user_id}
                    </Link>
                  ) : (
                    "unknown"
                  )}
                  {item.email && item.username ? ` (${item.email})` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
