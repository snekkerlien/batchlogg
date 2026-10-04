"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";
import { INVENTORY_CATEGORIES, SNUS_CATEGORIES } from "@/lib/inventory/categories";

/**
 * ADD INVENTORY ITEM
 */
export async function addInventoryItem(formData: FormData) {
  const { supabase } = await supabaseServer();

  const name = formData.get("name")?.toString();
  const category = formData.get("category")?.toString();
  const subcategory = formData.get("subcategory")?.toString() ?? "";
  const amount = Number(formData.get("amount"));
  const unit = formData.get("unit")?.toString();
  const minimum = Number(formData.get("minimum_amount"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");
  const selectedCategory = INVENTORY_CATEGORIES.find((item) => item.id === category);
  if (
    !category ||
    (!selectedCategory && !SNUS_CATEGORIES.includes(category as (typeof SNUS_CATEGORIES)[number])) ||
    !name?.trim() ||
    !unit?.trim() ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(minimum) ||
    minimum < 0 ||
    (selectedCategory &&
      subcategory &&
      !selectedCategory.subcategories.some((value) => value === subcategory))
  ) {
    throw new Error("Invalid inventory item");
  }
  if (SNUS_CATEGORIES.some((value) => value === category)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("snus_is_true")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw new Error("Could not verify inventory category access");
    if (!profile?.snus_is_true) throw new Error("Forbidden inventory category");
  }

  const { error } = await supabase.from("inventory_items").insert({
    user_id: user.id,
    name: name.trim(),
    category,
    subcategory: subcategory || null,
    amount,
    unit: unit.trim(),
    minimum_amount: minimum,
  });
  if (error) throw new Error(`Failed to add inventory item: ${error.message}`);

  revalidatePath("/inventory");
}

/**
 * UPDATE INVENTORY AMOUNT
 */
export async function updateInventoryAmount(
  id: string,
  newAmount: number,
  newMinimumAmount: number
) {
  const { supabase } = await supabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required");
  if (
    !id ||
    !Number.isFinite(newAmount) ||
    newAmount < 0 ||
    !Number.isFinite(newMinimumAmount) ||
    newMinimumAmount < 0
  ) {
    throw new Error("Invalid inventory amounts");
  }

  const { error } = await supabase
    .from("inventory_items")
    .update({
      amount: newAmount,
      minimum_amount: newMinimumAmount,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to update inventory item: ${error.message}`);
  }

  revalidatePath("/inventory");
}

/**
 * DELETE INVENTORY ITEM
 */
export async function deleteInventoryItem(id: string) {
  const { supabase } = await supabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(`Failed to delete inventory item: ${error.message}`);

  revalidatePath("/inventory");
}
