"use client";

import { useEffect, useState } from "react";
import {
  addInventoryItem,
  updateInventoryAmount,
  deleteInventoryItem,
} from "@/app/actions/inventoryActions";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export function useInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const snusCategories = ["snus", "snusessens"];
  const [profile, setProfile] = useState<any>(null);

  

  async function loadProfile() {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();
console.log("SESSION:", session);
    

    if (!session) {
      setProfile(null);
      return;
    }

    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const data = await res.json();
    console.log("PROFILE FETCH RESPONSE:", res.status);
console.log("PROFILE DATA:", data);
    setProfile(data);
  }

  async function loadItems() {
    const { data } = await supabaseBrowser
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });
      console.log("RAW ITEMS FROM SUPABASE:", data);


    let filtered = data || [];

    // Filtrer snus KUN når profile er lastet
    if (profile !== null && !profile.snus_is_true) {
      filtered = filtered.filter(
        (i) => !snusCategories.includes(i.category)
      );
    }
    console.log("FILTERED ITEMS:", filtered);

    setItems(filtered);
    setLoading(false);
  }

 useEffect(() => {
  loadProfile();
}, []);

useEffect(() => {
  if (profile !== null) {
    loadItems();
  }
}, [profile]);

 

  // Når profile endres → last items på nytt (med riktig snus-filter)
  useEffect(() => {
    loadItems();
  }, [profile]);

  useEffect(() => {
  console.log("PROFILE FROM useInventory:", profile);
}, [profile]);

  async function addItem(formData: FormData) {
    await addInventoryItem(formData);
    await loadItems();
  }

  async function updateItem(id: string, amount: number) {
    await updateInventoryAmount(id, amount);
    await loadItems();
  }

  async function deleteItem(id: string) {
    await deleteInventoryItem(id);
    await loadItems();
  }

  return { items, loading, profile, addItem, updateItem, deleteItem };
}
