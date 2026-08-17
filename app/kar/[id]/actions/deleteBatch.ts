"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function deleteBatch(formData: FormData) {
  const batchnummer = Number(formData.get("batchnummer"));
  const kode = String(formData.get("kode"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("server_log").insert({
    message: `deleteBatch called: batchnummer=${batchnummer}, kode=${kode}`
  });

  const { data: batch, error } = await supabase
    .from("Batches")
    .select("*")
    .eq("batchnummer", batchnummer)
    .maybeSingle();

  await supabase.from("server_log").insert({
    message: `Production batch: ${JSON.stringify(batch)}`
  });

  if (!batch) {
    await supabase.from("server_log").insert({
      message: `Batch not found in production`
    });
    throw new Error("Batch finnes ikke");
  }

  if (batch.kode !== kode) {
    await supabase.from("server_log").insert({
      message: `Wrong code in production`
    });
    throw new Error("Feil kode");
  }

  await supabase.from("server_log").insert({
    message: `Deleting batch ${batchnummer}`
  });

  await supabase
    .from("Batches")
    .delete()
    .eq("batchnummer", batchnummer);

  await supabase.from("server_log").insert({
    message: `Batch ${batchnummer} deleted OK`
  });

  redirect(`/kar/${batch.aktivt_kar}`);
}
