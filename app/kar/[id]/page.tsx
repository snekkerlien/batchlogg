"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ActiveBatch from "./ActiveBatch";
import RegisterBatchForm from "./RegisterBatchForm";

export default function KarPage({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kar, setKar] = useState(null);
  const [batch, setBatch] = useState(null);

  const karId = Number(params.id);

  useEffect(() => {
    async function init() {
      // Sjekk session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const user = sessionData.session.user;

      // Finn karet i databasen
      const { data: karData } = await supabase
        .from("kar")
        .select("*")
        .eq("id", karId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!karData) {
        router.push("/dashboard");
        return;
      }

      setKar(karData);

      // Finn aktiv batch
      const { data: batchData } = await supabase
        .from("Batches")
        .select("*")
        .eq("aktivt_kar", karId)
        .eq("user_id", user.id)
        .eq("status", "Aktiv")
        .maybeSingle();

      setBatch(batchData);

      setLoading(false);
    }

    init();
  }, [karId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Laster...</p>
      </main>
    );
  }

  const ledig = !batch;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <h1 className="text-4xl font-bold mb-6 text-center">{kar.navn}</h1>

        {ledig ? (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Ledig kar
            </h2>

            <p className="opacity-80 mb-6 text-center">
              Dette karet har ingen aktiv gjæring.
            </p>

            <h3 className="text-xl font-semibold mb-4 text-center">
              Registrer ny batch
            </h3>

            <RegisterBatchForm karId={karId} />

            <a
              href="/dashboard"
              className="mt-6 block text-center px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition"
            >
              ← Tilbake
            </a>
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Aktiv batch
            </h2>

            <ActiveBatch batchnummer={batch.batchnummer} />
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg. Alle rettigheter reservert.
        </p>
      </div>
    </main>
  );
}
