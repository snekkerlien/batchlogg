import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

export default async function KarPage({ params }: Props) {
  const karId = Number(params.id);

  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kar {karId}</h1>

      <form action={createBatch} className="space-y-4">
        <input type="hidden" name="kar" value={karId} />

        <div>
          <label className="block mb-1">Batchnavn</label>
          <input
            type="text"
            name="name"
            required
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Volum (liter)</label>
          <input
            type="number"
            name="volume"
            required
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Status</label>
          <select
            name="status"
            required
            className="border p-2 rounded w-full"
          >
            <option value="Aktiv">Aktiv</option>
            <option value="Secondary">Secondary</option>
            <option value="Klaring">Klaring</option>
            <option value="Flasket">Flasket</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Opprett batch
        </button>
      </form>
    </div>
  );
}
