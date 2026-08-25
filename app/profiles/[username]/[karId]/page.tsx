export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

type KarDetailParams = {
  username: string;
  karId: string;
};

export default async function KarDetailPage({
  params,
}: {
  params: KarDetailParams;
}) {
  const { supabase } = supabaseServer();

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">You must be logged in</h1>
      </main>
    );
  }

  // Find user by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profile not found</h1>
      </main>
    );
  }

  const userId = profile.id;

  // Fetch vessel
  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("id", params.karId)
    .eq("user_id", userId)
    .single();

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Vessel not found</h1>
      </main>
    );
  }

  // Fetch batches linked to this vessel
  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", kar.id)
    .eq("user_id", userId);

  const activeBatch = batches?.find((b) => b.status === "Aktiv");
  const secondaryBatch = batches?.find((b) => b.status === "Sekundær");

  // Choose batch (active → secondary)
  const batch = activeBatch || secondaryBatch;

  // Fetch notes from batch_notes
  let notes: any[] = [];

  if (batch) {
    const { data: notesData } = await supabase
      .from("batch_notes")
      .select("*")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false });

    notes = notesData || [];
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <MenuOverlay />
        </div>

        {/* HEADER */}
        <h1 className="text-4xl font-bold mb-2 text-center">
          Vessel {kar.displayNummer ?? kar.nummer}
        </h1>

        <h2 className="text-xl text-center opacity-80 mb-10">
          {batch?.status === "Sekundær"
            ? "Secondary fermentation"
            : "Active fermentation"}
        </h2>

        {/* EMPTY VESSEL */}
        {!batch && (
          <>
            <p className="text-center opacity-70 mb-10">
              This vessel is currently empty.
            </p>
          </>
        )}

        {/* BATCH INFO */}
        {batch && (
          <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">

            <h3 className="text-xl font-bold text-green-300 mb-2">
              {batch.name}
            </h3>

            <p className="opacity-80">Batch number: {batch.batchnummer}</p>
            <p className="opacity-80">
              Start date: {new Date(batch.startdato).toLocaleDateString("en-GB")}
            </p>
            <p className="opacity-80">Volume: {batch.volume_l} L</p>
            <p className="opacity-80">OG: {batch.og}</p>

            {batch.status === "Sekundær" && (
              <p className="opacity-80 mt-2">
                Secondary since:{" "}
                {new Date(batch.secondary_startdate).toLocaleDateString("en-GB")}
              </p>
            )}

            {batch.secondary_additions && (
              <p className="opacity-80 mt-2 whitespace-pre-wrap">
                Additions:<br />{batch.secondary_additions}
              </p>
            )}

            {batch.secondary_notes && (
              <p className="opacity-80 mt-2 whitespace-pre-wrap">
                Notes:<br />{batch.secondary_notes}
              </p>
            )}

            {/* Recipe */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-xl font-bold mb-3 text-green-300">Recipe</h3>

              <div className="space-y-4 text-sm whitespace-pre-wrap">

                <div>
                  <h4 className="font-semibold text-white/90 mb-1">Ingredients</h4>
                  <p className="opacity-80">
                    {batch.oppskrift.split("Ingredienser:")[1]?.split("Fremgangsmåte:")[0]?.trim()}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white/90 mb-1">Full process</h4>
                  <p className="opacity-80">
                    {batch.oppskrift.split("Fremgangsmåte:")[1]?.split("Notater:")[0]?.trim()}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white/90 mb-1">Notes</h4>
                  <p className="opacity-80">
                    {batch.oppskrift.split("Notater:")[1]?.trim()}
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* NOTES & IMAGES */}
        {batch && (
          <>
            <h2 className="text-2xl font-semibold mt-12 mb-4 text-center">
              Notes & images
            </h2>

            <div className="space-y-4">
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-white/10 border border-white/20 rounded-xl"
                  >
                    <p className="text-sm opacity-60">
                      {new Date(n.created_at).toLocaleDateString("en-GB")}
                    </p>

                    {n.note_type === "image" && n.image_url && (
                      <img
                        src={n.image_url}
                        alt="Note image"
                        className="rounded-lg mt-3"
                      />
                    )}

                    {n.note && (
                      <p className="mt-3 whitespace-pre-line">{n.note}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="opacity-60 text-center">No notes yet.</p>
              )}
            </div>
          </>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
