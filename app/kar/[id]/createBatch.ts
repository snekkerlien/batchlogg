"use server";

// Midlertidig deaktivert mens Supabase bygges opp fra scratch
export async function createBatch(formData: FormData) {
  console.log("createBatch disabled until Supabase is ready");
  return { kar: null };
}
