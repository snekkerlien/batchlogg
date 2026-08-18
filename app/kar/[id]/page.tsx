"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ActiveBatch from "./ActiveBatch";
import RegisterBatchForm from "./RegisterBatchForm";

function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
      }}
      className="block mb-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold w-fit"
    >
      Logg ut
    </button>
  );
}

export default function KarPage() {
  const router = useRouter();
  const params = useParams();
  const karId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [kar, setKar] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function init() {
      // Hent session fra supabase-js
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const user = sessionData.session.user;

      // Hent kar
      const { data: karData } = await supabase
        .from("kar")
        .select("*")
        .eq("id", karId)
        .maybeSingle();

      if (!karData) {
        router.push("/dashboard");
        return;
      }

      setKar(karData);
      setIsOwner(karData.user_id === user.id);

      // Hent aktiv batch
      const { data: batchData } = await supabase
        .from("Batches")
        .select("*")
        .eq("aktivt_kar", karId)
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
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-6 py-12">

      {/* Hjem-knapp */}
      <a
        href="/dashboard"
        className="block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
      >
        🏠 Hjem
      </a>

      {/* LOGG UT-KNAPP */}
      <LogoutButton />

      {/* Tilbake-knapp */}
      <button
        onClick={() => window.history.back()}
        className="block mb-8 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
      >
        ← Tilbake
      </button>

      {/* Aktiv batch */}
      {batch && <ActiveBatch batch={batch} />}

      {/* Ledig kar */}
      {ledig && isOwner && <RegisterBatchForm karId={karId} />}

      {!ledig && !isOwner && (
        <p className="text-gray-400 mt-4">Dette karet er i bruk.</p>
      )}
    </main>
  );
}
