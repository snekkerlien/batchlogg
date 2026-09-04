"use client";

import AddItemForm from "./AddItemForm";

export default function AddItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/60 border border-white/10 rounded-xl p-6 w-full max-w-lg relative">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Add new item</h2>

        <AddItemForm onSubmitComplete={onClose} />
      </div>
    </div>
  );
}
