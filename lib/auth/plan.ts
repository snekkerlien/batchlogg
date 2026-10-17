import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const PLAN_TIERS = ["free", "premium"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === "string" && (PLAN_TIERS as readonly string[]).includes(value);
}

export function normalizePlanTier(value: unknown): PlanTier {
  return value === "premium" ? "premium" : "free";
}

export async function hasPremiumAccess(
  serviceRole: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await serviceRole
    .from("profiles")
    .select("account_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not verify Premium access", error);
    throw new Error("Could not verify Premium access");
  }

  if (!data) {
    throw new Error("Could not verify Premium access: profile not found");
  }

  return normalizePlanTier(data.account_tier) === "premium";
}

export async function premiumGateResponse(
  serviceRole: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  try {
    if (await hasPremiumAccess(serviceRole, userId)) return null;
    return NextResponse.json(
      { error: "This feature requires Premium.", upgradeUrl: "/premium" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Could not verify Premium feature access", error);
    return NextResponse.json(
      { error: "Could not verify Premium access" },
      { status: 500 }
    );
  }
}
