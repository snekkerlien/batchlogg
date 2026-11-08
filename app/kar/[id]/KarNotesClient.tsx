"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { deleteNoteServer } from "./deleteNoteServer";
import { deleteImageServer } from "./deleteImage";
import { addNote } from "@/app/actions/addNote";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import PublicMentionText from "@/app/components/PublicMentionText";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  onNoteAdded,
}: {
  batchId: string;
  karId: string;
  userId: string;
  notes: NoteType[];
  onNoteAdded: () => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    isImage: boolean;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!imagePreview) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
    if (savingNote) return;
    if (!noteText.trim() && !imageFile) {
      setNoteStatus(t("Add a note or choose an image before saving."));
      return;
    }

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

  setSavingNote(true);
  setNoteStatus("");
  try {
    await addNote(formData);
    setNoteText("");
    setImageFile(null);
    setImagePreview(null);
    setNoteStatus(t("Note saved."));
    try {
      await onNoteAdded();
    } catch (refreshError) {
      console.error("Note was saved, but the batch note list could not refresh", refreshError);
      setNoteStatus(t("Note saved, but the list could not refresh. Please reload the page."));
    }
  } catch (saveError) {
    console.error("Could not save batch note", saveError);
    setNoteStatus(
      saveError instanceof Error
        ? `${t("Could not save note:")} ${saveError.message}`
        : t("Could not save note. Please try again."),
    );
  } finally {
    setSavingNote(false);
  }
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
      setDeleteError(t("Could not delete this item. Please try again."));
      return false;
    }
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-10">

      {/* ADD NEW NOTE */}
      <h3 className="text-xl font-semibold mb-4">{t("Add note")}</h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-10">
        {noteStatus && (
          <p role="status" aria-live="polite" className="text-sm text-white/75">
            {noteStatus}
          </p>
        )}

        <input type="hidden" name="batch_id" value={batchId} />
        <input type="hidden" name="kar_id" value={karId} />
        <input type="hidden" name="user_id" value={userId} />

        <PublicMentionTextarea
          name="note"
          value={noteText}
          onChange={setNoteText}
          placeholder={t("Make a note...")}
          rows={5}
          className="w-full min-h-32 resize-y p-3 rounded bg-black/40 border border-white/20"
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
            alt={t("Preview")}
            className="rounded-lg border border-white/20 mt-2 max-h-80 object-contain"
          />
        )}

        <button
          type="submit"
          disabled={savingNote}
          className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:cursor-wait disabled:opacity-60"
        >
          {savingNote ? t("Saving…") : t("Save note")}
        </button>
      </form>

      {/* SHOW NOTES */}
      <div className="flex flex-col gap-4 mb-10">
        {deleteError && (
          <p role="alert" className="text-center text-sm text-amber-300">
            {deleteError}
          </p>
        )}
        {notes.length === 0 && (
          <p className="opacity-60 text-center">{t("No notes yet.")}</p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="p-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <p className="opacity-80 mb-2">
              {new Date(note.created_at).toLocaleString(language === "nb" ? "nb-NO" : undefined)}
            </p>

            {note.note && (
              <p className="mb-2 whitespace-pre-wrap">
                <PublicMentionText text={note.note} unitAware />
              </p>
            )}

            {note.image_url && (
              <Image
                src={note.image_url}
                alt={t("Batch image")}
                width={960}
                height={720}
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
                loading="lazy"
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
                  {t("Delete picture")}
                </button>
              ) : (
                <button
                  onClick={() => setPendingDelete({ id: note.id, isImage: false })}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                >
                  {t("Delete note")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.isImage ? t("Delete picture?") : t("Delete note?")}
        message={t("This action cannot be undone.")}
        confirmLabel={pendingDelete?.isImage ? t("Delete picture") : t("Delete note")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
