// ingen "use client" her

import DeleteBatchButton from "./DeleteBatchButton";

export default function ActiveBatch({ batch }: { batch: any }) {
  return (
    <div className="flex justify-between mt-8">
      <a
        href="/"
        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition"
      >
        ← Tilbake
      </a>

      <DeleteBatchButton batchnummer={batch.batchnummer ?? ""} />
    </div>
  );
}
