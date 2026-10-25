import type { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export interface PublicMention {
  type: "recipe" | "batch";
  id: string;
  name: string;
  context?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENTION_PATTERN =
  /\[@([^\]\r\n]{1,1000})\]\(batchlogg:\/\/(recipe|batch)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\?context=([^)\r\n]{1,500}))?\)/gi;

function decodeMentionValue(value: string | undefined) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function parsePublicMentions(text: string | null | undefined): PublicMention[] {
  if (!text) return [];

  const mentions: PublicMention[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    if (!UUID_PATTERN.test(match[3])) continue;
    mentions.push({
      type: match[2].toLowerCase() as PublicMention["type"],
      id: match[3],
      name: match[1],
      context: decodeMentionValue(match[4]),
    });
  }
  return mentions;
}

export async function validatePublicMentions(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string,
  text: string
) {
  const mentions = parsePublicMentions(text);
  const recipeIds = [...new Set(mentions.filter((item) => item.type === "recipe").map((item) => item.id))];
  const batchIds = [...new Set(mentions.filter((item) => item.type === "batch").map((item) => item.id))];

  if (recipeIds.length) {
    const { data: recipes, error: recipesError } = await serviceRole
      .from("recipes")
      .select("id, user_id")
      .in("id", recipeIds)
      .eq("user_id", userId)
      .eq("is_public", true);
    if (recipesError) throw recipesError;

    const ownerIds = [...new Set((recipes ?? []).map((recipe) => recipe.user_id))];
    const { data: profiles, error: profilesError } = ownerIds.length
      ? await serviceRole
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .eq("is_public", true)
      : { data: [], error: null };
    if (profilesError) throw profilesError;

    const publicOwners = new Set((profiles ?? []).map((profile) => profile.id));
    const visibleRecipes = new Set(
      (recipes ?? [])
        .filter((recipe) => publicOwners.has(recipe.user_id))
        .map((recipe) => recipe.id)
    );
    if (recipeIds.some((id) => !visibleRecipes.has(id))) return false;
  }

  if (batchIds.length) {
    const { data: batches, error: batchesError } = await serviceRole
      .from("batches")
      .select("id, aktivt_kar, user_id")
      .in("id", batchIds)
      .eq("user_id", userId)
      .not("aktivt_kar", "is", null);
    if (batchesError) throw batchesError;

    const vesselIds = [...new Set((batches ?? []).map((batch) => batch.aktivt_kar))];
    const { data: vessels, error: vesselsError } = vesselIds.length
      ? await serviceRole
          .from("kar")
          .select("id")
          .in("id", vesselIds)
          .eq("is_public", true)
      : { data: [], error: null };
    if (vesselsError) throw vesselsError;

    const publicVessels = new Set((vessels ?? []).map((vessel) => vessel.id));
    const visibleBatches = new Set(
      (batches ?? [])
        .filter((batch) => publicVessels.has(batch.aktivt_kar))
        .map((batch) => batch.id)
    );
    if (batchIds.some((id) => !visibleBatches.has(id))) return false;
  }

  return true;
}
