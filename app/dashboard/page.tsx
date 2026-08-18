import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Hent session via API
  const sessionRes = await fetch("https://batchlogg.vercel.app/api/session", {
    cache: "no-store",
  });

  // Hvis API feiler → redirect til login
  if (!sessionRes.ok) {
    redirect("https://batchlogg.vercel.app/auth/login");
  }

  const { user } = await sessionRes.json();

  // Hvis ingen bruker → redirect til login
  if (!user) {
    redirect("https://batchlogg.vercel.app/auth/login");
  }

  // Hent kar via API
  const karRes = await fetch(
    `https://batchlogg.vercel.app/api/kar?user=${user.id}`,
    {
      cache: "no-store",
    }
  );

  if (!karRes.ok) {
    redirect("https://batchlogg.vercel.app/auth/login");
  }

  const kar = await karRes.json();

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
          © {new Date().getFullYear()} Fiklebrygg. Alle rettigheter reservert.
        </p>
      </div>
    </main>
  );
}
