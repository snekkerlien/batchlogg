"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addInventoryItem,
  updateInventoryAmount,
  deleteInventoryItem,
} from "@/app/actions/inventoryActions";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

const snusCategories = ["snus", "snusessens"];

export function useInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabaseBrowser
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load inventory items", error);
      setLoading(false);
      return;
    }

    const visibleItems =
      profile?.snus_is_true === true
        ? data ?? []
        : (data ?? []).filter((item) => !snusCategories.includes(item.category));

    setItems(visibleItems);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) {
        console.error("Could not load inventory session", sessionError);
        if (active) setProfileLoaded(true);
        return;
      }

      if (!session) {
        if (active) setProfileLoaded(true);
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          throw new Error(`Profile request failed (${response.status})`);
        }

        const profileData = await response.json();
        if (active) setProfile(profileData);
      } catch (error) {
        console.error("Could not load inventory profile", error);
      } finally {
        if (active) setProfileLoaded(true);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (profileLoaded) void loadItems();
  }, [profileLoaded, loadItems]);

  const addItem = useCallback(async (formData: FormData) => {
    await addInventoryItem(formData);
    await loadItems();
  }, [loadItems]);

  const updateItem = useCallback(async (
    id: string,
    amount: number,
    minimumAmount: number
  ) => {
    await updateInventoryAmount(id, amount, minimumAmount);
    await loadItems();
  }, [loadItems]);

  const deleteItem = useCallback(async (id: string) => {
    await deleteInventoryItem(id);
    await loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    profile,
    profileLoaded,
    addItem,
    updateItem,
    deleteItem,
  };
}
