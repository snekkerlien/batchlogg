"use server";

import { deleteBatch } from "./deleteBatch";

export async function DeleteBatchAction(formData: FormData) {
  return deleteBatch(formData);
}
