"use client";

import AddItemForm from "./AddItemForm";

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  profile: any;
  onAddItem: (formData: FormData) => Promise<void>;
};

export default function AddItemModal({
  open,
  onClose,
  profile,
  onAddItem,
}: AddItemModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-xl text-white/70 hover:text-white"
        >
          ✕
        </button>
        <h2 className="mb-4 text-center text-2xl font-bold">Add new item</h2>
        <AddItemForm
          onSubmitComplete={onClose}
          onAddItem={onAddItem}
          profile={profile}
        />
      </div>
    </div>
  );
}
