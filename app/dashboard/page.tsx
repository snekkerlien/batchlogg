import { redirect } from "next/navigation";
import { createServerClient } from "../../lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    redirect("/auth/login");
  }

  const user = session.user;

  // Bare en kul velkomsttekst
  const welcomeText = "Velkommen tilbake til bryggeriet, kompis 🍻";

  const { data: kar, error } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  if (error) {
    console.error("KAR ERROR", error);
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <form action="/logout" method="post">
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-800 rounded-lg font-semibold">
            Logg ut
          </button>
        </form>
      </div>

      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 text-center">

        <h1 className="text-2xl font-bold mb-4">
          Logget inn som {user.id}
        </h1>

        <p className="opacity-80 mb-8 text-lg">
          {welcomeText}
        </p>

        <a
          href="/profiles"
          className="inline-block mb-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        <div className="grid grid-cols-3 gap-4 justify-items-center max-w-[420px] mx-auto">
          {kar.map((k: any) => (
            <a
              key={k.id}
              href={`/kar/${k.id}`}
              className="relative border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition flex flex-col items-center w-28 h-28"
            >
              <span className="absolute top-[10px] text-lg font-bold text-green-300">
                {k.navn.replace("Kar ", "")}
              </span>

              <span className="text-zinc-400 mt-10">Ledig</span>
            </a>
          ))}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg. Alle rettigheters reservert.
        </p>
      </div>
    </main>
  );
}
