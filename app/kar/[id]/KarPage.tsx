"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import { useAuth } from "../../providers/useAuth";
import { ActiveBatch } from "./ActiveBatch";
import KarClient from "./KarClient";
import Link from "next/link";

function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await supabaseBrowser.auth.signOut();
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
  const karId = params.id as string;

  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kar, setKar] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    async function loadKar() {
      const { data: karData } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("id", karId)
        .maybeSingle();

      const { data: batchData } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("aktivt_kar", karId)
        .eq("status", "Aktiv")
        .maybeSingle();

      if (!karData) {
        router.replace("/dashboard");
        return;
      }

      setKar(karData);
      setIsOwner(karData.user_id === user.id);
      setBatch(batchData);
      setLoading(false);
    }

    loadKar();
  }, [authLoading, user, karId, router]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl border border-white/10 text-white">
          Laster...
        </div>
      </main>
    );
  }

  const ledig = !batch;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-2xl border border-white/10 text-white">

        <Link
          href="/dashboard"
          prefetch={false}
          className="block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
        >
          🏠 Hjem
        </Link>

        <LogoutButton />

        <Link
          href="/dashboard"
          className="block mb-8 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
        >
          ← Tilbake
        </Link>

        {batch && <ActiveBatch karId={karId} batch={batch} />}

        {ledig && isOwner && <KarClient kar={kar} />}

        {!ledig && !isOwner && (
          <p className="text-gray-300 mt-4">Dette karet er i bruk.</p>
        )}
      </div>
    </main>
  );
}
