export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import { translateOldRecipe } from "@/lib/translateOldRecipe";
import PageHeading from "@/app/components/PageHeading";
import ReportContentButton from "@/app/components/ReportContentButton";
import { Qty, UnitAwareText } from "@/app/components/Units";
import PublicMentionText from "@/app/components/PublicMentionText";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import TranslatedText from "@/app/components/TranslatedText";

type KarDetailParams = {
  username: string;
  karId: string;
};

function daysSince(dateString: string) {
  const start = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return days;
}

function dayLabel(days: number) {
  return days === 1 ? "day" : "days";
}

export default async function KarDetailPage({
  params,
}: {
  params: KarDetailParams;
}) {
  const { supabase } = supabaseServer();
  let username = params.username;
  try {
    username = decodeURIComponent(username);
  } catch {
    // Keep the original route value if it is not a valid encoded component.
  }

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold"><TranslatedText text="You must be logged in" /></h1>
      </main>
    );
  }

  // Find user by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold"><TranslatedText text="Profile not found" /></h1>
      </main>
    );
  }

  const userId = profile.id;

  // Fetch vessel
  const { data: kar } = await supabase
  .from("kar")
  .select("*")
  .eq("id", params.karId)
  .single();

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold"><TranslatedText text="Vessel not found" /></h1>
      </main>
    );
  }

  // Fetch batches linked to this vessel
  const { data: batches } = await supabase
  .from("batches")
  .select("*")
  .eq("aktivt_kar", kar.id);

  const activeBatch = batches?.find((b) => b.status === "Aktiv");
const conditioningBatch = batches?.find((b) => b.status === "Conditioning");
const secondaryBatch = batches?.find((b) =>
  ["Sekundær", "secondary"].includes(b.status)
);

// Choose batch (active → secondary)
let batch = activeBatch || secondaryBatch || conditioningBatch;

// ⭐ Oversett gamle batches til moderne format
batch = translateOldRecipe(batch);


  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <MenuOverlay />
        </div>

        {/* HEADER */}
        <PageHeading
          title={<TranslatedText text="Vessel" />}
          subtitle={
            !batch
              ? <TranslatedText text="This vessel is currently empty." />
              : batch.status === "Conditioning"
                ? <TranslatedText text="Conditioning" />
                : ["Sekundær", "secondary"].includes(batch.status)
                  ? <TranslatedText text="Secondary fermentation" />
                  : <TranslatedText text="Primary fermentation" />
          }
        />

        {/* EMPTY VESSEL */}
        {!batch && (
          <>
            <p className="text-center opacity-70 mb-10">
              <TranslatedText text="This vessel is currently empty." />
            </p>
          </>
        )}

        {/* BATCH INFO */}
        {batch && (
          <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
            {user.id !== profile.id && (
              <div className="mb-3 flex justify-end">
                <ReportContentButton
                  contentType="batch"
                  contentId={batch.id}
                  contextUrl={`/members/${encodeURIComponent(profile.username)}/${kar.id}`}
                />
              </div>
            )}

            <h3 className="text-xl font-bold text-green-300 mb-2">
              {batch.name}
            </h3>

            <p className="opacity-80"><TranslatedText text="Batch number:" /> {batch.batchnummer}</p>
            <p className="opacity-80">
                <TranslatedText text="Start date:" /> {new Date(batch.startdato).toLocaleDateString("en-US")}
                <span className="ml-2 opacity-70">
                  ({daysSince(batch.startdato)} <TranslatedText text={dayLabel(daysSince(batch.startdato))} />)
                </span>
              </p>
            <p className="opacity-80"><TranslatedText text="Volume:" /> <Qty kind="volume" value={batch.volume_l} /></p>
            <p className="opacity-80">OG: {batch.og}</p>

            {["Sekundær", "secondary"].includes(batch.status) && (
              <p className="opacity-80 mt-2">
                <TranslatedText text="Secondary since:" />{" "}
                {new Date(batch.secondary_startdate).toLocaleDateString("en-US")}
              </p>
            )}

            {batch.status === "Conditioning" && batch.conditioning_startdate && (
              <p className="opacity-80 mt-2">
                <TranslatedText text="Conditioning since:" />{" "}
                {new Date(batch.conditioning_startdate).toLocaleDateString("en-US")}
              </p>
            )}

            {batch.secondary_additions && (
              <p className="opacity-80 mt-2 whitespace-pre-wrap">
                <TranslatedText text="Additions:" /><br /><UnitAwareText text={formatSecondaryAdditions(batch.secondary_additions)} />
              </p>
            )}

            {batch.secondary_notes && (
              <p className="opacity-80 mt-2 whitespace-pre-wrap">
                <TranslatedText text="Notes:" /><br /><PublicMentionText text={batch.secondary_notes} unitAware />
              </p>
            )}

            {/* ⭐ UNIVERSAL RECIPE RENDERER */}
<div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
  <h3 className="text-xl font-bold mb-3 text-green-300"><TranslatedText text="Recipe" /></h3>

  <div className="space-y-4 text-sm whitespace-pre-wrap">

    {/* ⭐ Fallback for gamle batches */}
    {!batch.type && batch.oppskrift && (
      <p className="opacity-80"><UnitAwareText text={batch.oppskrift} /></p>
    )}

    {/* ⭐ MEAD */}
    {batch.type === "Mead" && (
      <>
        <p><strong><TranslatedText text="Honey:" /></strong> {batch.honey_type || <TranslatedText text="Unknown" />} – <Qty kind="kg" value={batch.honey_amount} fallback="?" /></p>

        {batch.fruits?.length > 0 && (
          <div>
            <strong><TranslatedText text="Fruits:" /></strong>
            {batch.fruits.map((f: any, i: number) => (
              <p key={i}>{f.name}: {f.amount}{f.unit}</p>
            ))}
          </div>
        )}

        <p className="whitespace-pre-line"><strong><TranslatedText text="Additives:" /></strong><br />{batch.additives ? <UnitAwareText text={batch.additives} /> : <TranslatedText text="None" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Full process:" /></strong><br />{batch.full_process ? <PublicMentionText text={batch.full_process} unitAware /> : <TranslatedText text="No process described" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Notes:" /></strong><br />{batch.notes ? <PublicMentionText text={batch.notes} unitAware /> : <TranslatedText text="No notes" />}</p>
      </>
    )}

    {/* ⭐ BEER */}
    {batch.type === "Beer" && (
      <>
        {batch.beer_style && <p><strong><TranslatedText text="Beer style:" /></strong> {batch.beer_style}</p>}
        {batch.malts?.length > 0 && (
          <div>
            <strong><TranslatedText text="Malt additions:" /></strong>
            {batch.malts.map((m: any, i: number) => (
              <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
            ))}
          </div>
        )}

        {batch.hops?.length > 0 && (
          <div>
            <strong><TranslatedText text="Hop schedule:" /></strong>
            {batch.hops.map((h: any, i: number) => (
              <p key={i}>{h.name}: <Qty kind="g" value={h.amount} maxDecimals={0} /> @ {h.boil} min</p>
            ))}
          </div>
        )}

        {batch.dry_hops?.length > 0 && (
          <div>
            <strong><TranslatedText text="Dry hops:" /></strong>
            {batch.dry_hops.map((h: any, i: number) => (
              <p key={i}>{h.name}: <Qty kind="g" value={h.amount} maxDecimals={0} /> — {h.contact} <TranslatedText text={Number(h.contact) === 1 ? "day" : "days"} /></p>
            ))}
          </div>
        )}

        <p><strong><TranslatedText text="Total boil time:" /></strong> {batch.boil_time || <TranslatedText text="Unknown" />} <TranslatedText text={batch.boil_time === 1 ? "minute" : "minutes"} /></p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Additives:" /></strong><br />{batch.additives ? <UnitAwareText text={batch.additives} /> : <TranslatedText text="None" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Full process:" /></strong><br />{batch.full_process ? <PublicMentionText text={batch.full_process} unitAware /> : <TranslatedText text="No process described" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Notes:" /></strong><br />{batch.notes ? <PublicMentionText text={batch.notes} unitAware /> : <TranslatedText text="No notes" />}</p>
      </>
    )}

    {/* ⭐ BRAGGOT */}
    {batch.type === "Braggot" && (
      <>
        {batch.malts?.length > 0 && (
          <div>
            <strong><TranslatedText text="Malt additions:" /></strong>
            {batch.malts.map((m: any, i: number) => (
              <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
            ))}
          </div>
        )}

        <p><strong><TranslatedText text="Boil time:" /></strong> {batch.boil_time || <TranslatedText text="Unknown" />} <TranslatedText text={batch.boil_time === 1 ? "minute" : "minutes"} /></p>
        <p><strong><TranslatedText text="Honey:" /></strong> <Qty kind="kg" value={batch.honey_amount} fallback="?" /></p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Additives:" /></strong><br />{batch.additives ? <UnitAwareText text={batch.additives} /> : <TranslatedText text="None" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Full process:" /></strong><br />{batch.full_process ? <PublicMentionText text={batch.full_process} unitAware /> : <TranslatedText text="No process described" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Notes:" /></strong><br />{batch.notes ? <PublicMentionText text={batch.notes} unitAware /> : <TranslatedText text="No notes" />}</p>
      </>
    )}

    {/* ⭐ CIDER / WINE / SELTZER */}
    {(batch.type === "Cider" ||
      batch.type === "Wine" ||
      batch.type === "Seltzer") && (
      <>
        <p><strong><TranslatedText text="Juice type:" /></strong> {batch.juice_type || <TranslatedText text="Unknown" />}</p>
        <p><strong><TranslatedText text="Sugar added:" /></strong> <Qty kind="kg" value={batch.sugar_amount} fallback="?" /></p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Additives:" /></strong><br />{batch.additives ? <UnitAwareText text={batch.additives} /> : <TranslatedText text="None" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Full process:" /></strong><br />{batch.full_process ? <PublicMentionText text={batch.full_process} unitAware /> : <TranslatedText text="No process described" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Notes:" /></strong><br />{batch.notes ? <PublicMentionText text={batch.notes} unitAware /> : <TranslatedText text="No notes" />}</p>
      </>
    )}

    {/* ⭐ OTHER */}
    {batch.type === "Other" && (
      <>
        {batch.other_style && (
          <p><strong><TranslatedText text="Style or type:" /></strong> {batch.other_style}</p>
        )}
        {batch.ingredients?.length > 0 && (
          <div>
            <strong><TranslatedText text="Ingredients:" /></strong>
            {batch.ingredients.map((ing: any, idx: number) => (
              <p key={idx}>{ing.name}: {ing.amount}{ing.unit}</p>
            ))}
          </div>
        )}

        {batch.steps?.length > 0 && (
          <div>
            <strong><TranslatedText text="Process steps:" /></strong>
            {batch.steps.map((s: string, idx: number) => (
              <p key={idx}>{idx + 1}. {s}</p>
            ))}
          </div>
        )}

        <p className="whitespace-pre-line"><strong><TranslatedText text="Additives:" /></strong><br />{batch.additives ? <UnitAwareText text={batch.additives} /> : <TranslatedText text="None" />}</p>
        <p className="whitespace-pre-line"><strong><TranslatedText text="Notes:" /></strong><br />{batch.notes ? <PublicMentionText text={batch.notes} unitAware /> : <TranslatedText text="No notes" />}</p>
      </>
    )}

  </div>
</div>



          </div>
        )}

      </div>
    </main>
  );
}
