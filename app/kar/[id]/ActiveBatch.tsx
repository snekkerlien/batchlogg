"use client";

import DeleteModal from "./DeleteModal";

type Batch = {
  id: number;
  user_id: string;
  batchnummer: string;
  status: string;
  startdato: string;
  batchstorrelse: string;
  og: string;
  fg: string;
  name?: string;
  volume_l?: number;
  kode?: string;
  oppskrift?: string;
};

export default function ActiveBatch({ batch }: { batch: Batch }) {
  // Formatert batchnummer (0001, 0002, osv.)
  const formattedBatch = String(batch.batchnummer).padStart(4, "0");

  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-white/10 space-y-4">
      <h2 className="text-xl font-semibold">Aktiv batch</h2>

      <div className="space-y-1">
        <p><strong>Batchnummer:</strong> {formattedBatch}</p>
        <p><strong>Status:</strong> {batch.status}</p>
        <p><strong>Startdato:</strong> {batch.startdato}</p>
        <p><strong>Batchstørrelse:</strong> {batch.batchstorrelse}</p>
        <p><strong>OG:</strong> {batch.og}</p>
        <p><strong>FG:</strong> {batch.fg}</p>

        {batch.name && (
          <p><strong>Navn:</strong> {batch.name}</p>
        )}

        {batch.volume_l && (
          <p><strong>Volum:</strong> {batch.volume_l} L</p>
        )}

        {batch.kode && (
          <p><strong>Kode:</strong> {batch.kode}</p>
        )}

        {batch.oppskrift && (
          <p><strong>Oppskrift:</strong> {batch.oppskrift}</p>
        )}
      </div>

      {/* Slettemodal */}
      <DeleteModal batchnummer={formattedBatch} />
    </div>
  );
}
