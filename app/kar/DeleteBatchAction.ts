"use server";

import { deleteBatch } from "./[id]/deleteBatch";

export async function DeleteBatchAction(formData: FormData) {
  return deleteBatch(formData);
}
