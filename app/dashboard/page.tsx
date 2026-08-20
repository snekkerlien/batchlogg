import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  // Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Kar
  const { data: kar } = await supabase
    .from("kar")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at");

  const username = profile?.username ?? "Ukjent";

  // PC:
  // Mindre enn 3 elementer → 2 kolonner
  // 3 eller flere → 3 kolonner
  const pcCols = kar && kar.length < 3 ? "md:grid-cols-2" : "md:grid-cols-3";

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
          Logget inn som {username}
        </h1>

        <p className="opacity-80 mb-8 text-lg">
          Velkommen tilbake til bryggeriet, kompis 🍻
        </p>

        <a
          href="/profiles"
          className="inline-block mb-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        {/* --- KAR GRID --- */}
        <div
          className={`
            grid
            grid-cols-3        /* <-- Mobil: 3 kolonner */
            ${pcCols}          /* <-- PC: dynamisk 2 eller 3 */
            gap-4
            md:gap-2
            mx-auto
            max-w-[36rem]
            place-items-center
          `}
        >
          {kar?.map((k: any, index: number) => (
            <div
              key={k.id}
              className="relative border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center w-28 h-28"
            >
              {kar.length > 1 && index > 0 && (
                <form
                  action="/kar/delete"
                  method="post"
                  className="absolute top-1 right-2"
                >
                  <input type="hidden" name="kar_id" value={k.id} />
                  <button className="text-red-400 hover:text-red-300 text-xl font-bold">
                    ×
                  </button>
                </form>
              )}

              <a href={`/kar/${k.id}`} className="flex flex-col items-center">
                <span className="absolute top-[10px] text-lg font-bold text-green-300">
                  Kar {index + 1}
                </span>

                <span className="text-zinc-400 mt-10">Ledig</span>
              </a>
            </div>
          ))}

          {kar && kar.length < 9 && (
            <form action="/kar/add" method="post">
              <button
                className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center w-28 h-28 text-4xl font-bold text-green-300"
              >
                +
              </button>
            </form>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg.
        </p>
      </div>
    </main>
  );
}
