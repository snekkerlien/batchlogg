export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" })
      }
    }
  );

  // Hent alle aktive batches (alltid ferske data)
  const { data: batches } = await supabase
    .from("Batches")
    .select("*")
    .eq("status", "Aktiv");

  const aktiveKar = new Set(batches?.map((b) => b.aktivt_kar));

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      {/* CO₂-boble-animasjon + lokk-hover */}
      <style>{`
        .co2-bubble {
          position: absolute;
          bottom: 0;
          background: rgba(0, 255, 100, 0.25);
          border-radius: 50%;
          animation: co2-rise var(--speed) infinite ease-in-out;
          opacity: 0;
        }

        @keyframes co2-rise {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-160px) scale(1);
            opacity: 0;
          }
        }

        /* Lokk-animasjon */
        .group:hover .lokket {
          transform: rotate(-8deg);
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
                className="group border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition flex flex-col items-center relative overflow-hidden"
              >
                {/* Gjæringskar-ikon med tall inni */}
                <div className="flex flex-col items-center mb-2 relative">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-300"
                  >
                    {/* Lokk – nå animerbart */}
                    <path
                      d="M4 4h16v2H4z"
                      className="lokket transition-transform duration-300"
                      style={{ transformOrigin: "12px 4px" }}
                    />

                    {/* Bøtteform */}
                    <path d="M6 6v11a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V6" />

                    {/* Nivåmerking */}
                    <path d="M9 10h6" />

                    {/* Gjærlås */}
                    <path d="M12 2v2" />
                    <circle cx="12" cy="2" r="1" />
                  </svg>

                  {/* Tall inni ikonet */}
                  <span className="absolute top-[14px] text-lg font-bold text-green-300">
                    {kar}
                  </span>
                </div>

                {aktiv ? (
                  <>
                    <span className="text-green-400 font-semibold">
                      Aktiv batch
                    </span>

                    {/* CO₂-bobler */}
                    {[...Array(12)].map((_, i) => (
                      <span
                        key={i}
                        className="co2-bubble"
                        style={{
                          left: `${Math.random() * 100}%`,
                          width: `${5 + Math.random() * 7}px`,
                          height: `${5 + Math.random() * 7}px`,
                          animationDelay: `${Math.random() * 2.5}s`,
                          ...({ ["--speed"]: `${8 + Math.random() * 6}s` } as any)
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <span className="text-zinc-400">Ledig</span>
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
