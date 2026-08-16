import { supabase } from "@/lib/supabaseClient";
import { createBatch } from "./actions/createBatch";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

export default async function KarPage({ params }: Props) {
  const karId = Number(params.id);

  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  const { data: activeBatch } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();

  const hasActive = !!activeBatch;

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-zinc-900 p-6 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Kar {karId}
        </h1>

        {hasActive ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              Aktiv batch: {activeBatch.batchnavn}
            </p>

            <p>Startdato: {activeBatch.startdato}</p>
            <p>Status: {activeBatch.status}</p>
            <p>Batchnummer: {activeBatch.batchnummer}</p>
            <p>Batchstørrelse: {activeBatch.batchstorrelse} L</p>
            <p>OG: {activeBatch.og}</p>
            <p>FG: {activeBatch.fg}</p>
            <p>Oppskrift: {activeBatch.oppskrift}</p>

            <p className="mt-4 text-sm text-zinc-400">
              Logg og kommentarer kommer i neste steg.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-zinc-300">
              Ingen aktiv gjæring på dette karet. Opprett ny batch:
            </p>

            <form action={createBatch} className="space-y-4">
              <div>
                <label className="block mb-1">Batchnavn</label>
                <input
                  type="text"
                  name="batchnavn"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
