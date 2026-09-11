"use client";

import { useEffect, useState } from "react";
import AddItemForm from "./AddItemForm";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  profile: any;
};

export default function AddItemModal({ open, onClose, profile }: AddItemModalProps) {
  const [localProfile, setLocalProfile] = useState<any>(profile ?? null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) return;

      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      setLocalProfile(data);
    }

    if (open && !profile) {
      // Only fetch if parent didn't already provide profile
      loadProfile();
    }
  }, [open, profile]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/60 border border-white/10 rounded-xl p-6 w-full max-w-lg relative">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Add new item</h2>

        {/* Pass correct profile to AddItemForm */}
       <AddItemForm onSubmitComplete={onClose} profile={profile} />
      </div>
    </div>
  );
}
