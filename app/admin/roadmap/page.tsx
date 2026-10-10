import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default async function RoadmapPage() {
  const { serviceRole } = supabaseServer();

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
        <h1 className="text-3xl font-bold">Roadmap</h1>
        <Link
          href="/admin"
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20"
        >
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {STATUS_COLUMNS.map((col) => (
          <div
            key={col.key}
            className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md"
          >
            <h2 className="text-xl font-semibold mb-4">{col.label}</h2>

            <div className="space-y-4">
              {grouped[col.key].length === 0 && (
                <p className="text-white/40 text-sm">No items.</p>
              )}

              {grouped[col.key].map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <span className="inline-block mb-2 px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-semibold">
                    {item.category}
                  </span>

                  <p className="text-sm whitespace-pre-wrap">{item.message}</p>

                  <p className="text-xs text-white/50 mt-2">
                    {new Date(item.created_at).toLocaleString("en-GB")}
                  </p>

                  <form
                    action="/api/admin/roadmap/update"
                    method="POST"
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="id" value={item.id} />

                    {STATUS_COLUMNS.filter((s) => s.key !== item.status).map((s) => (
                      <button
                        key={s.key}
                        name="status"
                        value={s.key}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20"
                      >
                        {s.label}
                      </button>
                    ))}
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
