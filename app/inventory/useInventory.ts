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

  async function loadItems() {
    const { data } = await supabaseBrowser
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

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

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
  };
}
