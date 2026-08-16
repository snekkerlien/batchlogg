import { createBatch } from "./actions/createBatch";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-zinc-900 p-6 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Ny batch</h1>

        <form action={createBatch} className="space-y-4">

          {/* Batchnavn */}
          <div>
            <label className="block mb-1">Navn på batch</label>
            <input
              type="text"
              name="name"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* Volum */}
          <div>
            <label className="block mb-1">Volum (liter)</label>
            <input
              type="number"
              name="volume"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* Kar */}
          <div>
            <label className="block mb-1">Aktivt kar</label>
            <select
              name="kar"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            >
              <option value="1">Kar 1</option>
              <option value="2">Kar 2</option>
              <option value="3">Kar 3</option>
              <option value="4">Kar 4</option>
              <option value="5">Kar 5</option>
              <option value="6">Kar 6</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block mb-1">Status</label>
            <select
              name="status"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            >
              <option value="Aktiv">Aktiv</option>
              <option value="Secondary">Secondary</option>
              <option value="Klaring">Klaring</option>
              <option value="Flasket">Flasket</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
          >
            Opprett batch
          </button>
        </form>
      </div>
    </main>
  );
}
