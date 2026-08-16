import { notFound } from "next/navigation";
import { createBatch } from "../../actions/createBatch";

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
        <input type="hidden" name="karId" value={karId} />

        <div>
          <label className="block mb-1">Batchnavn</label>
          <input
            type="text"
            name="batchName"
            required
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Startdato</label>
          <input
            type="date"
            name="startDate"
            required
            className="border p-2 rounded w-full"
          />
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
