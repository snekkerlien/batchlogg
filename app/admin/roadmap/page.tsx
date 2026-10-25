import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import DeleteRoadmapEntryButton from "./DeleteRoadmapEntryButton";

export const dynamic = "force-dynamic";

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams?: { error?: string; completed?: string };
}) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const role = authError || !user ? "member" : await getMembershipRole(supabase, user);
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
    .from("roadmap")
    .select("id, feedback_id, user_id, category, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <p className="text-red-300 text-center">
          Could not load roadmap: {error.message}
        </p>
      </main>
    );
  }

  const grouped = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = items?.filter((i) => i.status === col.key) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold text-green-300">Roadmap</h1>
        <BackButton />
      </div>

      {searchParams?.completed === "1" && (
        <p role="status" className="mb-6 text-green-300">
          The roadmap entry was marked completed.
        </p>
      )}
      {searchParams?.error && (
        <p role="alert" className="mb-6 text-center text-red-300">
          {searchParams.error === "notfound"
            ? "That roadmap entry no longer exists."
            : searchParams.error === "forbidden"
              ? "Only administrators can update the roadmap."
              : searchParams.error === "audit"
                ? "The roadmap change was made, but it could not be added to the audit log."
              : "The roadmap entry could not be updated. Please try again."}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {STATUS_COLUMNS.map((col) => (
          <div
            key={col.key}
            className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md"
          >
            <h2 className="mb-4 text-xl font-semibold text-green-300">{col.label}</h2>

            <div className="space-y-4">
              {grouped[col.key].length === 0 && (
                <p className="text-white/40 text-sm">No items.</p>
              )}

              {grouped[col.key].map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <span className="mb-2 inline-block rounded border border-green-400/30 bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-300">
                    {item.category}
                  </span>

                  <p className="text-sm whitespace-pre-wrap">{item.message}</p>

                  <p className="text-xs text-white/50 mt-2">
                    {new Date(item.created_at).toLocaleString("en-GB")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <form
                      action="/api/admin/roadmap/update"
                      method="POST"
                      className="flex flex-wrap gap-2"
                    >
                      <input type="hidden" name="id" value={item.id} />

                      {STATUS_COLUMNS.filter((s) => s.key !== item.status).map((s) => (
                        <button
                          key={s.key}
                          name="status"
                          value={s.key}
                          className={`rounded border px-2 py-1 text-xs ${
                            s.key === "completed"
                              ? "border-green-400/40 bg-green-500/10 font-semibold text-green-300 hover:bg-green-500/20"
                              : "border-white/20 bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          {s.key === "completed" ? "Complete" : s.label}
                        </button>
                      ))}
                    </form>
                    {item.status === "completed" && (
                      <DeleteRoadmapEntryButton id={item.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
