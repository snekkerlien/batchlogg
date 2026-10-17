import { membershipLabel } from "@/lib/auth/membership";
import { normalizePlanTier } from "@/lib/auth/plan";

type MembershipStatusProps = {
  status?: string | null;
  tier?: string | null;
};

export default function MembershipStatus({ status, tier }: MembershipStatusProps) {
  const label = membershipLabel(status);
  const planLabel =
    normalizePlanTier(tier) === "premium" ? "Premium" : "Free";

  return (
    <div className="mb-8 text-center">
      <p className="text-zinc-400 text-sm">Membership status</p>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm text-green-200">{planLabel} tier</p>
    </div>
  );
}
