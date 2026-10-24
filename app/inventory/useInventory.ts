"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/app/actions/inventoryActions";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

const snusCategories = ["snus", "snusessens"];

export function useInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabaseBrowser
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const visibleItems =
        profile?.snus_is_true === true
          ? data ?? []
          : (data ?? []).filter((item) => !snusCategories.includes(item.category));

      setItems(visibleItems);
    } catch (error) {
      console.error("Could not load inventory items", error);
      setLoadError("Inventory could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setProfileLoaded(false);

    async function loadProfile() {
      try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        if (active) {
          setProfile(null);
          setProfileLoaded(true);
        }
        return;
      }

        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          throw new Error(`Profile request failed (${response.status})`);
        }

        const profileData = await response.json();
        if (active) {
          setProfile(profileData);
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("Could not load inventory profile", error);
        if (active) {
          setLoadError("Inventory profile could not be loaded. Please try again.");
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [profileAttempt]);

  useEffect(() => {
    if (profileLoaded) void loadItems();
  }, [profileLoaded, loadItems]);

  const addItem = useCallback(async (formData: FormData) => {
    await addInventoryItem(formData);
    await loadItems();
  }, [loadItems]);

  const updateItem = useCallback(async (
    id: string,
    name: string,
    category: string,
    subcategory: string,
    amount: number,
    minimumAmount: number,
    bottleType: string
  ) => {
    await updateInventoryItem(id, name, category, subcategory, amount, minimumAmount, bottleType);
    await loadItems();
  }, [loadItems]);

  const deleteItem = useCallback(async (id: string) => {
    await deleteInventoryItem(id);
    await loadItems();
  }, [loadItems]);
  const reloadItems = useCallback(() => {
    setProfileAttempt((attempt) => attempt + 1);
  }, []);

  return {
    items,
    loading,
    loadError,
    reloadItems,
    profile,
    profileLoaded,
    addItem,
    updateItem,
    deleteItem,
  };
}
