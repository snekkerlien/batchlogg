"use client";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="p-2 bg-red-600"
    >
      Logg ut
    </button>
  );
}
