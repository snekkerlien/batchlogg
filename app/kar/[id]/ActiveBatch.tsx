"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export function ActiveBatch({ karId }: { karId: string }) {
  const supabase = supabaseBrowser;
  const [batch, setBatch] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("Batches")
        .select("*")
        .eq("aktivt_kar", karId)
        .eq("status", "Aktiv")
        .maybeSingle();

      setBatch(data);
    }

    load();
  }, [karId]);

  if (!batch) {
    return (
      <div className="text-gray-400 italic">
        Ingen aktiv batch i dette karet.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-xl font-bold mb-2">Aktiv batch</h2>

      <p><strong>Navn:</strong> {batch.name}</p>
      <p><strong>Batchnummer:</strong> {batch.batchnummer}</p>
      <p><strong>Startdato:</strong> {batch.startdato}</p>
      <p><strong>Volum:</strong> {batch.volume_l} L</p>
      <p><strong>OG:</strong> {batch.og}</p>
      <p><strong>Kode:</strong> {batch.kode}</p>
      <p><strong>Oppskrift:</strong> {batch.oppskrift}</p>
    </div>
  );
}
