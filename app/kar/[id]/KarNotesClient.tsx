"use client";

import { useState } from "react";
import { deleteNoteServer } from "./deleteNoteServer";
import { deleteImageServer } from "./deleteImage";
import * as Actions from "./actions";

type NoteType = {
  id: string;
  note: string | null;
  image_url: string | null;
  created_at: string;
};

export function KarNotesClient({
  batchId,
  karId,
  userId,   // ⭐ NYTT
  notes,
}: {
  batchId: string;
  karId: string;
  userId: string;   // ⭐ NYTT
  notes: NoteType[];
}) {
  const [noteText, setNoteText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(formData: FormData) {
    formData.set("kar_id", karId);     // ⭐ viktig
    formData.set("user_id", userId);   // ⭐ viktig

    if (imageFile) {
      formData.set("image", imageFile);
    }

    await Actions.addBatchNote(formData);

    setNoteText("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNoteServer(noteId, karId);
  }

  async function handleDeleteImage(noteId: string, imageUrl: string) {
    await deleteImageServer(noteId, imageUrl, karId);
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-10">

      <h3 className="text-xl font-semibold mb-4">Notater & bilder</h3>

      {/* VIS NOTATER */}
      <div className="flex flex-col gap-4 mb-10">
        {notes.length === 0 && (
          <p className="opacity-60 text-center">Ingen notater enda.</p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="p-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <p className="opacity-80 mb-2">
              {new Date(note.created_at).toLocaleString()}
            </p>

            {note.note && (
              <p className="mb-2 whitespace-pre-wrap">{note.note}</p>
            )}

            {note.image_url && (
              <img
                src={note.image_url}
                alt="Batch bilde"
                className="rounded-lg mt-2 border border-white/20"
              />
            )}

            {/* SLETT-KNAPPER */}
            <div className="flex gap-3 mt-4">
              {note.image_url ? (
                <button
                  onClick={() => handleDeleteImage(note.id, note.image_url!)}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg text-sm font-semibold"
                >
                  Slett bilde
                </button>
              ) : (
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg text-sm font-semibold"
                >
                  Slett notat
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SKJEMA FOR NYTT NOTAT */}
      <h3 className="text-xl font-semibold mb-4">Legg til notat</h3>

      <form action={handleSubmit} className="flex flex-col gap-4">

        <input type="hidden" name="batch_id" value={batchId} />

        <textarea
          name="note"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Skriv et notat..."
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {/* BILDE-INPUT MED PREVIEW */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            className="rounded-lg border border-white/20 mt-2"
          />
        )}

        <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
          Lagre notat
        </button>
      </form>
    </div>
  );
}
