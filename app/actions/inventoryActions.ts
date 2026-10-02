"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

/**
 * ADD INVENTORY ITEM
 */
export async function addInventoryItem(formData: FormData) {
  const { supabase } = await supabaseServer();

  const name = formData.get("name")?.toString();
  const category = formData.get("category")?.toString();
  const amount = Number(formData.get("amount"));
  const unit = formData.get("unit")?.toString();
  const minimum = Number(formData.get("minimum_amount"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("inventory_items").insert({
    user_id: user.id,
    name,
    category,
    amount,
    unit,
    minimum_amount: minimum,
  });

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

  const { error } = await supabase
    .from("inventory_items")
    .update({
      amount: newAmount,
      minimum_amount: newMinimumAmount,
    })
    .eq("id", id);

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

  await supabase.from("inventory_items").delete().eq("id", id);

  revalidatePath("/inventory");
}
