import { createClient } from "@supabase/supabase-js";

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Hent alle aktive batches
  const { data: batches } = await supabase
    .from("Batches")
    .select("*")
    .eq("status", "Aktiv");

  // Lag et kart over hvilke kar som er aktive
  const aktiveKar = new Set(batches?.map((b) => b.aktivt_kar));

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      {/* Boble-animasjon (CSS) */}
      <style>{`
        .bubble-wrap {
          position: relative;
        }

        .bubble-wrap::before,
        .bubble-wrap::after {
          content: "";
          position: absolute;
          left: 50%;
          width: 6px;
          height: 6px;
          background: rgba(0, 255, 100, 0.4);
          border-radius: 50%;
          animation: bubble-rise 2.4s infinite ease-in-out;
        }

        .bubble-wrap::after {
          width: 4px;
          height: 4px;
          animation-duration: 3.1s;
          animation-delay: 0.8s;
        }

        @keyframes bubble-rise {
          0% {
            transform: translate(-50%, 6px) scale(0.8);
            opacity: 0.0;
          }
          30% {
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -14px) scale(1);
            opacity: 0;
          }
        }
      `}</style>

      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Batchlogg</h1>

        <p className="opacity-80 mb-8">
          Oversikt over alle kar og deres status.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((kar) => {
            const aktiv = aktiveKar.has(kar);

            return (
              <a
                key={kar}
                href={`/kar/${kar}`}
                className="border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition flex flex-col items-center relative overflow-hidden"
              >
                <span className="text-xl font-semibold mb-2">Kar {kar}</span>

                {aktiv ? (
                  <span className="text-green-400 font-semibold bubble-wrap">
                    Aktiv batch
                  </span>
                ) : (
                  <span className="text-zinc-400">Ledig</span>
                )}
              </a>
            );
          })}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Batchlogg – laget av Mads
        </p>
      </div>
    </main>
  );
}
