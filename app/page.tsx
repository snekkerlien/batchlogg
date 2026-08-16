export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Batchlogg</h1>

        <p className="opacity-80 mb-8">
          Velg et kar for å se aktiv batch eller registrere en ny.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((kar) => (
            <a
              key={kar}
              href={`/kar/${kar}`}
              className="border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition"
            >
              <span className="text-xl font-semibold">Kar {kar}</span>
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
