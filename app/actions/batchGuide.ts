"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasPremiumEntitlement } from "@/lib/auth/plan";
import {
  isBatchGuideMilestone,
  type BatchGuideMilestone,
} from "@/lib/brewing/batchGuide";

export type GuideBatch = {
  id: string;
  name: string | null;
  type: string | null;
  batchnummer: string | null;
  status: string | null;
  og: number | null;
  fg: number | null;
  abv: number | null;
  volume_l: number | null;
};

export async function getGuideBatch(
  target: { vesselId: string } | { batchId: string }
): Promise<GuideBatch | null> {
  const id = "vesselId" in target ? target.vesselId : target.batchId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid batch guide target");
  }
  const { supabase } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required");

  let query = supabase.from("batches").select(
    "id, name, type, batchnummer, status, og, fg, abv, volume_l"
  );
  if ("vesselId" in target) {
    query = query.eq("aktivt_kar", target.vesselId)
      .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"]);
  } else {
    query = query.eq("id", target.batchId).eq("user_id", user.id);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load guide batch: ${error.message}`);
  return data;
}

export async function getPremiumWelcomeStatus() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required");

  const { data: profile, error } = await serviceRole
    .from("profiles")
    .select("account_tier, membership_status, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load Premium welcome status: ${error.message}`);
  if (!profile) throw new Error("Could not find the profile for Premium welcome");

  const isPremium = hasPremiumEntitlement(profile.account_tier, profile.membership_status);
  const onboardingCompleted = profile.onboarding_completed === true;
  const seen = user.user_metadata?.batchlogg_premium_welcome_seen === true;
  return {
    isPremium,
    onboardingCompleted,
    shouldShow:
      isPremium && onboardingCompleted && !seen,
  };
}

export async function dismissPremiumWelcome() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");

  const { error } = await supabase.auth.updateUser({
    data: { batchlogg_premium_welcome_seen: true },
  });
  if (error) throw new Error(`Could not save Premium welcome preference: ${error.message}`);
}

export async function dismissBatchGuide(milestone: BatchGuideMilestone) {
  if (!isBatchGuideMilestone(milestone)) {
    throw new Error("Invalid batch guide milestone");
  }

  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");

  const currentDismissals = user.user_metadata?.batchlogg_batch_guide_dismissed;
  const dismissed =
    typeof currentDismissals === "object" &&
    currentDismissals !== null &&
    !Array.isArray(currentDismissals)
      ? currentDismissals
      : {};

  const { error } = await supabase.auth.updateUser({
    data: {
      batchlogg_batch_guide_dismissed: {
        ...dismissed,
        [milestone]: true,
      },
    },
  });

  if (error) throw new Error(`Could not save batch guide preference: ${error.message}`);
}
