export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-900">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Batchlogg</h1>

        <a
          href="/login"
          className="block bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold"
        >
          Logg inn
        </a>

        <a
          href="/signup"
          className="block bg-green-600 hover:bg-green-700 p-3 rounded font-semibold"
        >
          Registrer
        </a>
      </div>
    </div>
  );
}
