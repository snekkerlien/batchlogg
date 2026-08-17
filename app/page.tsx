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

        /* 5 bobler med forskjellig posisjon, størrelse og timing */
        .bubble-wrap span.b1,
        .bubble-wrap span.b2,
        .bubble-wrap span.b3,
        .bubble-wrap span.b4,
        .bubble-wrap span.b5 {
          position: absolute;
          bottom: -4px;
          background: rgba(0, 255, 100, 0.35);
          border-radius: 50%;
          animation: bubble-rise 2.8s infinite ease-in-out;
        }

        .bubble-wrap span.b1 {
          left: 20%;
          width: 6px;
          height: 6px;
          animation-delay: 0.2s;
        }

        .bubble-wrap span.b2 {
          left: 40%;
          width: 4px;
          height: 4px;
          animation-delay: 0.6s;
          animation-duration: 3.2s;
        }

        .bubble-wrap span.b3 {
          left: 60%;
          width: 7px;
          height: 7px;
          animation-delay: 1.0s;
          animation-duration: 2.6s;
        }

        .bubble-wrap span.b4 {
          left: 75%;
          width: 5px;
          height: 5px;
          animation-delay: 1.4s;
          animation-duration: 3.0s;
        }

        .bubble-wrap span.b5 {
          left: 30%;
          width: 3px;
          height: 3px;
          animation-delay: 1.8s;
          animation-duration: 2.4s;
        }

        @keyframes bubble-rise {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-18px) scale(1);
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

                    {/* 5 bobler */}
                    <span className="b1"></span>
                    <span className="b2"></span>
                    <span className="b3"></span>
                    <span className="b4"></span>
                    <span className="b5"></span>
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
