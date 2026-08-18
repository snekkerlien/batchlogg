import { createServerClient } from "../../lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function KarPage({ params }: { params: { id: string } }) {
  // Supabase SSR-klient (må await'es)
  const supabase = await createServerClient();

  // Hent bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Hent alle kar for brukeren
  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id);

  // AUTO-CREATE KAR 1 hvis ingen finnes
  if (!kar || kar.length === 0) {
    const { data: newKar } = await supabase
      .from("kar")
      .insert({
        user_id: user.id,
        navn: "Kar 1",
      })
      .select()
      .single();

    // Etter insert → redirect til riktig kar
    redirect(`/kar/${newKar.id}`);
  }

  // Finn karet brukeren prøver å åpne
  const currentKar = kar.find((k) => k.id === params.id);

  // Hvis brukeren prøver å åpne et kar som ikke finnes → redirect
  if (!currentKar) {
    redirect("/dashboard");
  }

  // Hent aktiv batch for dette karet
  const { data: activeBatch } = await supabase
    .from("Batches")
    .select("*")
    .eq("aktivt_kar", params.id)
    .eq("status", "Aktiv")
    .maybeSingle();

  // Render siden
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-4">{currentKar.navn}</h1>

      {activeBatch ? (
        <p className="text-green-400">Aktiv batch: {activeBatch.batchnummer}</p>
      ) : (
        <p className="text-zinc-400">Ingen aktiv batch</p>
      )}

      {/* Her legger du inn ActiveBatch, RecipeEditor, RegisterBatchForm osv */}
    </main>
  );
}
