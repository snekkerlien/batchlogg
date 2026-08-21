"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import { useAuth } from "../../providers/useAuth";
import { ActiveBatch } from "./ActiveBatch";
import KarClient from "./KarClient";
import Link from "next/link";

type Note = {
  id?: string;
  note: string | null;
  note_type: "text" | "image";
  image_url?: string | null;
  created_at: string;
};

export default function KarPage() {
  const router = useRouter();
  const params = useParams();
  const karId = params.id as string;

  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kar, setKar] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Logg / notater
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Meny
  const [menuOpen, setMenuOpen] = useState(false);

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

      if (batchData) {
        const { data: notesData } = await supabaseBrowser
          .from("batch_notes")
          .select("id, note, note_type, image_url, created_at")
          .eq("batch_id", batchData.id)
          .order("created_at", { ascending: false });

        setNotes((notesData || []) as Note[]);
      }

      setLoading(false);
    }

    loadKar();
  }, [authLoading, user, karId, router]);

  async function uploadImage(e: any) {
    const file = e.target.files?.[0];
    if (!file || !batch) return;

    setUploading(true);

    // Preview
    setImagePreview(URL.createObjectURL(file));

    const fileName = `${batch.id}-${Date.now()}`;

    const { error: uploadError } = await supabaseBrowser.storage
      .from("batch-images")
      .upload(fileName, file, {
        upsert: false,
        metadata: {
          owner: user.id,
        },
      });

    if (uploadError) {
      console.error("UPLOAD ERROR:", uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabaseBrowser.storage
      .from("batch-images")
      .getPublicUrl(fileName);

    setImageUrl(urlData.publicUrl);
    setUploading(false);
  }

  async function addNote() {
    if (!batch) return;
    if (!newNote.trim() && !imageUrl) return;

    const noteText = newNote.trim() !== "" ? newNote : null;

    const { data: inserted, error } = await supabaseBrowser
      .from("batch_notes")
      .insert({
        batch_id: batch.id,
        user_id: user.id,
        note: noteText,
        note_type: imageUrl ? "image" : "text",
        image_url: imageUrl || null,
      })
      .select("id, note, note_type, image_url, created_at")
      .single();

    if (!error && inserted) {
      setNotes([
        inserted as Note,
        ...notes,
      ]);

      setNewNote("");
      setImagePreview(null);
      setImageUrl(null);
    }
  }

  async function deleteImage(noteId: string, imageUrl: string) {
    // Fjern fra Storage
    const path = imageUrl.split("/").pop()!;

    const { error: storageError } = await supabaseBrowser.storage
      .from("batch-images")
      .remove([path]);

    if (storageError) {
      console.error("STORAGE DELETE ERROR:", storageError);
    }

    // Fjern notat fra DB
    const { error: noteError } = await supabaseBrowser
      .from("batch_notes")
      .delete()
      .eq("id", noteId);

    if (noteError) {
      console.error("NOTE DELETE ERROR:", noteError);
    }

    // Fjern fra UI
    setNotes(notes.filter((n) => n.id !== noteId));
  }

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
    <main className="min-h-screen flex flex-col items-center px-6 py-12 relative">

      {/* MENY */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-white"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="mt-2 bg-black/80 border border-white/20 rounded-lg p-4 text-right backdrop-blur-md">
            <Link
              href="/dashboard"
              className="block mb-3 text-white hover:text-green-300 font-semibold"
            >
              🏠 Hjem
            </Link>

            <a
              href="/account"
              className="block mb-3 text-white hover:text-green-300 font-semibold"
            >
              Min konto
            </a>

            <button
              onClick={async () => {
                await supabaseBrowser.auth.signOut();
                router.replace("/auth/login");
              }}
              className="text-red-400 hover:text-red-300 font-semibold"
            >
              Logg ut
            </button>
          </div>
        )}
      </div>

      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-2xl border border-white/10 text-white">

        {batch && <ActiveBatch karId={karId} batch={batch} />}
        {ledig && isOwner && <KarClient kar={kar} />}
        {!ledig && !isOwner && <p className="text-gray-300 mt-4">Dette karet er i bruk.</p>}

        {!ledig && isOwner && (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Logg / Notater</h2>

            {/* Notat + bilde */}
            <div className="mb-6 flex gap-4 items-start">

              <div className="w-full">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Skriv et notat..."
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20"
                />

                {imagePreview && (
                  <img
                    src={imagePreview}
                    className="rounded-lg mt-3 border border-white/20"
                  />
                )}
              </div>

              <button
                onClick={addNote}
                className="flex items-center justify-center w-[150px] h-[48px] bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white text-center"
              >
                Legg til notat
              </button>

              <label className="flex items-center justify-center w-[150px] h-[48px] bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white text-center cursor-pointer">
                {uploading ? "Laster..." : "Last opp bilde"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Liste */}
            <div className="space-y-4">
              {notes.length === 0 && (
                <p className="opacity-60">Ingen notater enda.</p>
              )}

              {notes.map((n) => (
                <div key={n.id ?? n.created_at} className="p-4 bg-white/10 border border-white/20 rounded-xl">
                  <p className="text-sm opacity-60">
                    {new Date(n.created_at).toLocaleDateString("no-NO")}
                  </p>

                  {n.note_type === "image" && n.image_url && (
                    <>
                      <img src={n.image_url} className="rounded-lg mt-2" />

                      {n.note && (
                        <p className="mt-2 whitespace-pre-line">{n.note}</p>
                      )}

                      {n.id && (
                        <button
                          onClick={() => deleteImage(n.id!, n.image_url!)}
                          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
                        >
                          Slett bilde
                        </button>
                      )}
                    </>
                  )}

                  {n.note_type === "text" && n.note && (
                    <p className="mt-2 whitespace-pre-line">{n.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
