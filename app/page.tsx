import { createBatch } from "./actions/createBatch";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-zinc-900 p-6 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Ny batch</h1>

        <form action={createBatch} className="space-y-4">

          {/* Batchnavn */}
          <div>
            <label className="block mb-1">Batchnavn</label>
            <input
              type="text"
              name="batchnavn"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* Startdato */}
          <div>
            <label className="block mb-1">Startdato</label>
            <input
              type="date"
              name="startdato"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* Aktivt kar */}
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

          {/* Batchstørrelse */}
          <div>
            <label className="block mb-1">Batchstørrelse (liter)</label>
            <input
              type="number"
              name="batchstorrelse"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* OG */}
          <div>
            <label className="block mb-1">OG</label>
            <input
              type="number"
              step="0.001"
              name="og"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* FG */}
          <div>
            <label className="block mb-1">FG</label>
            <input
              type="number"
              step="0.001"
              name="fg"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>

          {/* Oppskrift */}
          <div>
            <label className="block mb-1">Oppskrift</label>
            <input
              type="text"
              name="oppskrift"
              required
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
            />
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
