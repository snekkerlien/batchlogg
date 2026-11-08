import { membershipLabel } from "@/lib/auth/membership";
import { normalizePlanTier } from "@/lib/auth/plan";
import TranslatedText from "@/app/components/TranslatedText";

type MembershipStatusProps = {
  status?: string | null;
  tier?: string | null;
  hasPremiumAccess?: boolean;
};

export default function MembershipStatus({
  status,
  tier,
  hasPremiumAccess,
}: MembershipStatusProps) {
  const label = membershipLabel(status);
  const planLabel =
    hasPremiumAccess ?? normalizePlanTier(tier) === "premium"
      ? "Premium"
      : "Free";

  return (
    <div className="mb-8 text-center">
      <p className="text-zinc-400 text-sm"><TranslatedText text="Membership status" /></p>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm text-green-200">
        <TranslatedText text={planLabel} /> <TranslatedText text="tier" />
      </p>
    </div>
  );
}
