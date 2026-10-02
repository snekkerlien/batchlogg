"use client";

import { useState } from "react";
import { deleteNoteServer } from "./deleteNoteServer";
import { deleteImageServer } from "./deleteImage";
import { addNote } from "@/app/actions/addNote";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type NoteType = {
  id: string;
  note: string | null;
  image_url: string | null;
  created_at: string;
};

export function KarNotesClient({
  batchId,
  karId,
  userId,
  notes,
}: {
  batchId: string;
  karId: string;
  userId: string;
  notes: NoteType[];
}) {
  const [noteText, setNoteText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    isImage: boolean;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const formData = new FormData();
  formData.set("batch_id", batchId);
  formData.set("kar_id", karId);
  formData.set("user_id", userId);

  if (noteText.trim() !== "") {
    formData.set("note", noteText.trim());
  }

  if (imageFile) {
    formData.set("image", imageFile);
  }

  await addNote(formData);

  setNoteText("");
  setImageFile(null);
  setImagePreview(null);
}


  async function confirmDelete() {
    if (!pendingDelete) return false;
    try {
      if (pendingDelete.isImage) {
        await deleteImageServer(pendingDelete.id, karId);
      } else {
        await deleteNoteServer(pendingDelete.id, karId);
      }
      setDeleteError("");
      return true;
    } catch (error) {
      console.error("Could not delete batch note or image", error);
      setDeleteError("Could not delete this item. Please try again.");
      return false;
    }
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-10">

      <h3 className="mb-4 text-xl font-semibold text-green-300">
        Notes & pictures
      </h3>

      {/* SHOW NOTES */}
      <div className="flex flex-col gap-4 mb-10">
        {deleteError && (
          <p role="alert" className="text-center text-sm text-amber-300">
            {deleteError}
          </p>
        )}
        {notes.length === 0 && (
          <p className="opacity-60 text-center">No notes yet.</p>
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
                alt="Batch image"
                className="rounded-lg mt-2 border border-white/20 max-h-80 object-contain"
              />
            )}

            {/* DELETE BUTTONS */}
            <div className="flex gap-3 mt-4">
              {note.image_url ? (
                <button
                  onClick={() => setPendingDelete({ id: note.id, isImage: true })}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                >
                  Delete picture
                </button>
              ) : (
                <button
                  onClick={() => setPendingDelete({ id: note.id, isImage: false })}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                >
                  Delete note
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD NEW NOTE */}
      <h3 className="text-xl font-semibold mb-4">Add note</h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <input type="hidden" name="batch_id" value={batchId} />
        <input type="hidden" name="kar_id" value={karId} />
        <input type="hidden" name="user_id" value={userId} />

        <textarea
          name="note"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Make a note..."
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {/* IMAGE INPUT WITH PREVIEW */}
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
            className="rounded-lg border border-white/20 mt-2 max-h-80 object-contain"
          />
        )}

        <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
          Save note
        </button>
      </form>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.isImage ? "Delete picture?" : "Delete note?"}
        message="This action cannot be undone."
        confirmLabel={pendingDelete?.isImage ? "Delete picture" : "Delete note"}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
