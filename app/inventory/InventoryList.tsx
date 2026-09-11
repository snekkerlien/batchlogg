"use client";

import { useEffect, useState } from "react";
import InventoryItem from "./InventoryItem";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export default function InventoryList({ items }: { items: any[] }) {
  const [profile, setProfile] = useState<any>(null);

  // Skjulte kategorier
  const snusCategories = ["snus", "snusessens"];

  // Hent brukerprofil
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
      setProfile(data);
    }

    loadProfile();
  }, []);

  // Filtrer bort snus-kategorier hvis brukeren ikke har tilgang
  const visibleItems = items.filter((item) => {
  // Ikke filtrer før profile er lastet
  if (profile === null) return true;

  // Filtrer kun når profile er lastet
  if (!profile.snus_is_true && snusCategories.includes(item.category)) {
    return false;
  }

  return true;
});

  return (
    <div
      className="
        grid 
        grid-cols-1 
        sm:grid-cols-2 
        md:grid-cols-3 
        gap-6 
        mt-10
      "
    >
      {visibleItems.map((item) => (
        <InventoryItem key={item.id} item={item} />
      ))}
    </div>
  );
}
