"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function toggleInventoryUsage(newValue: boolean) {
  const { supabase } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("profiles")
    .update({ use_inventory: newValue })
    .eq("id", user.id);

  revalidatePath("/account");
}
