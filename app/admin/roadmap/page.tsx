import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import DeleteRoadmapEntryButton from "./DeleteRoadmapEntryButton";
import { getRoadmapReturnPath } from "@/lib/admin/roadmapNavigation";

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
  searchParams?: { error?: string; completed?: string; created?: string; returnTo?: string };
}) {
  const returnTo = getRoadmapReturnPath(searchParams?.returnTo);
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
    <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="relative mx-auto mb-8 max-w-7xl">
        <h1 className="text-center text-3xl font-bold text-green-300">Roadmap</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <BackButton href={returnTo} />
        </div>
      </div>

      {searchParams?.completed === "1" && (
        <p role="status" className="mb-6 text-green-300">
          The roadmap entry was marked completed.
        </p>
      )}
      {searchParams?.created === "1" && (
        <p role="status" className="mb-6 text-green-300">
          The roadmap entry was added.
        </p>
      )}
      {searchParams?.error && (
        <p role="alert" className="mb-6 text-center text-red-300">
          {searchParams.error === "invalid"
            ? "Enter a category and a description between 3 and 3,000 characters."
            : searchParams.error === "create"
              ? "The roadmap entry could not be created. Please try again."
              : searchParams.error === "forbidden"
                ? "Only administrators can manage the roadmap."
                : searchParams.error === "audit"
                  ? "The roadmap entry was created, but the action could not be added to the audit log."
              : searchParams.error === "notfound"
            ? "That roadmap entry no longer exists."
              : "The roadmap entry could not be updated. Please try again."}
        </p>
      )}

      <details className="group mx-auto mb-8 w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 shadow-xl backdrop-blur-md">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-lg font-semibold text-green-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300 sm:px-7 [&::-webkit-details-marker]:hidden">
          <span>Add a roadmap item</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 shrink-0 text-white/70 transition-transform group-open:rotate-90"
          >
            <path
              d="m9 18 6-6-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="mx-auto max-w-2xl px-5 pb-5 sm:px-7 sm:pb-7">
          <form action={`/api/admin/roadmap/create?returnTo=${encodeURIComponent(returnTo)}`} method="POST" className="mt-5">
            <div>
              <label
                htmlFor="roadmap-message"
                className="mb-2 block text-sm font-medium text-white/75"
              >
                Description
              </label>
              <textarea
                id="roadmap-message"
                name="message"
                required
                minLength={3}
                maxLength={3000}
                rows={4}
                placeholder="Describe the roadmap item"
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/40"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <fieldset aria-label="Category" className="col-span-2 min-w-0 sm:col-span-3">
                <div className="grid h-full grid-cols-3 gap-2">
                  {[
                    ["suggestion", "Suggestion"],
                    ["bug", "Bug report"],
                    ["feedback", "General feedback"],
                  ].map(([value, label], index) => (
                    <label
                      key={value}
                      className="flex min-h-11 min-w-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-1 py-2.5 text-center text-xs font-semibold text-white/75 transition hover:bg-white/15 has-[:checked]:border-green-400/40 has-[:checked]:bg-green-700 has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-green-300 sm:px-2 sm:text-sm"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={value}
                        required
                        defaultChecked={index === 0}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                className="col-span-2 min-h-11 min-w-0 justify-self-center whitespace-nowrap rounded-lg border border-green-400/40 bg-green-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-600 sm:col-span-1 sm:w-full sm:px-2 sm:text-sm"
              >
                Add to planned
              </button>
            </div>
          </form>
        </div>
      </details>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-4">
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
                      action={`/api/admin/roadmap/update?returnTo=${encodeURIComponent(returnTo)}`}
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
