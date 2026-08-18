"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
};

export default function ActiveBatch({ batchnummer }: { batchnummer: string }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBatch() {
      // batchnummer kommer inn som string, men vi formatterer det uansett
      const formattedBatch = String(batchnummer).padStart(4, "0");

      const { data, error } = await supabase
        .from("Batches")
        .select("*")
        .eq("batchnummer", formattedBatch)
        .maybeSingle();

      if (!error && data) {
        setBatch(data as Batch);
      }

      setLoading(false);
    }

    loadBatch();
  }, [batchnummer]);

  if (loading) {
    return (
      <div className="p-4 bg-zinc-900 rounded-lg border border-white/10">
        <p className="text-white">Laster batch...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-4 bg-zinc-900 rounded-lg border border-white/10">
        <p className="text-red-400">Fant ingen aktiv batch.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-white/10 space-y-4">
      <h2 className="text-xl font-semibold">Aktiv batch</h2>

      <div className="space-y-1">
        <p><strong>Batchnummer:</strong> {String(batch.batchnummer).padStart(4, "0")}</p>
        <p><strong>Status:</strong> {batch.status}</p>
        <p><strong>Startdato:</strong> {batch.startdato}</p>
        <p><strong>Batchstørrelse:</strong> {batch.batchstorrelse}</p>
        <p><strong>OG:</strong> {batch.og}</p>
        <p><strong>FG:</strong> {batch.fg}</p>
      </div>

      <DeleteModal batchnummer={String(batch.batchnummer).padStart(4, "0")} />
    </div>
  );
}
