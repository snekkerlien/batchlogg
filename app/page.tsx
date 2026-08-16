export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6 tracking-tight">
          Batchlogg
        </h1>

        <p className="text-lg opacity-80 mb-10 leading-relaxed">
          Hold oversikt over gjæring, karstatus og batch‑historikk.  
          En enkel og effektiv måte å følge bryggeprosessen på.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((kar) => (
            <a
              key={kar}
              href={`/kar/${kar}`}
              className="border border-white/10 rounded-xl p-6 text-center hover:bg-white/5 transition"
            >
              <h2 className="text-xl font-semibold mb-2">Kar {kar}</h2>
              <p className="text-sm opacity-70">Se status</p>
            </a>
          ))}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Batchlogg – laget av Mads
        </p>
      </div>
    </main>
  );
}
