"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function deleteBatch(formData: FormData) {
  const batchnummer = String(formData.get("batchnummer"));   // 👈 TEKST, IKKE Number()
  const kode = String(formData.get("kode"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Logg kall
  await supabase.from("server_log").insert({
    message: `deleteBatch called: batchnummer=${batchnummer}, kode=${kode}`
  });

  // Finn batch (tekst-søk)
  const { data: batch, error } = await supabase
    .from("Batches")
    .select("*")
    .eq("batchnummer", batchnummer)   // 👈 matcher "0001", "0002", osv.
    .maybeSingle();

  await supabase.from("server_log").insert({
    message: `Production batch lookup result: ${JSON.stringify(batch)}`
  });

  // Batch finnes ikke
  if (!batch) {
    await supabase.from("server_log").insert({
      message: `Batch not found in production for batchnummer=${batchnummer}`
    });
    return; // 👈 IKKE throw → Next.js krasjer ikke
  }

  // Feil kode
  if (batch.kode !== kode) {
    await supabase.from("server_log").insert({
      message: `Wrong code for batchnummer=${batchnummer}`
    });
    return; // 👈 IKKE throw → unngår hvit skjerm
  }

  // Slett batch
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

  // Redirect tilbake til riktig kar
  redirect(`/kar/${batch.aktivt_kar}`);
}
