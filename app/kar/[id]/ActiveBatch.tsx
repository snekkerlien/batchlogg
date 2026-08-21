"use client";

type ActiveBatchProps = {
  karId: string;
  batch: {
    id: string;
    batchnummer: string;
    name: string;
    volume_l: number;
    startdato: string;
    og: number;
    oppskrift: string;
    status: string;
    created_at: string;
    user_id: string;
  };
};

export function ActiveBatch({ karId, batch }: ActiveBatchProps) {
  return (
    <div className="p-4 bg-green-900/40 rounded-lg border border-green-600 text-white space-y-2">
      <h2 className="text-xl font-bold">Aktiv batch</h2>

      <p><strong>Batchnummer:</strong> {batch.batchnummer}</p>
      <p><strong>Navn:</strong> {batch.name}</p>
      <p><strong>Volum:</strong> {batch.volume_l} L</p>
      <p><strong>Startdato:</strong> {batch.startdato}</p>
      <p><strong>OG:</strong> {batch.og}</p>

      <p className="whitespace-pre-wrap">
        <strong>Oppskrift:</strong>{"\n"}
        {batch.oppskrift}
      </p>
    </div>
  );
}
