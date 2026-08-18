import { createServerClient } from "../../lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Hent bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("https://batchlogg.vercel.app/login");
  }

  // Hent kar
  let { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  // Auto-create Kar 1 hvis ingen finnes
  if (!kar || kar.length === 0) {
    await supabase
      .from("kar")
      .insert({
        user_id: user.id,
        navn: "Kar 1",
      });

    redirect("https://batchlogg.vercel.app/dashboard");
  }

  // Hent aktive batcher
  const { data: batches } = await supabase
    .from("Batches")
    .select("*")
    .eq("status", "Aktiv");

  const aktiveKar = new Set(batches?.map((b) => b.aktivt_kar) ?? []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-6xl mx-auto text-center">

        <form action="/logout" method="post">
          <button
            className="inline-block mb-6 px-6 py-3 bg-red-600 hover:bg-red-700 border border-red-800 rounded-lg font-semibold"
          >
            Logg ut
          </button>
        </form>

        <h1 className="text-4xl font-bold mb-6">Batchlogg</h1>

        <p className="opacity-80 mb-8">
          Oversikt over alle kar og deres status.
        </p>

        <div className="grid grid-cols-3 gap-4 justify-items-center max-w-[420px] mx-auto">
          {kar.map((k) => {
            const aktiv = aktiveKar.has(k.id);

            return (
              <a
                key={k.id}
                href={`/kar/${k.id}`}
                className="relative border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition flex flex-col items-center w-28 h-28"
              >
                <span className="absolute top-[10px] text-lg font-bold text-green-300">
                  {k.navn.replace("Kar ", "")}
                </span>

                {aktiv ? (
                  <span className="text-green-400 font-semibold mt-10">
                    Aktiv batch
                  </span>
                ) : (
                  <span className="text-zinc-400 mt-10">Ledig</span>
                )}
              </a>
            );
          })}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg. Alle rettigheter reservert.
        </p>
      </div>
    </main>
  );
}
