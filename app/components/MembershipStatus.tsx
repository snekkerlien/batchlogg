import { membershipLabel } from "@/lib/auth/membership";

type MembershipStatusProps = {
  status?: string | null;
};

export default function MembershipStatus({ status }: MembershipStatusProps) {
  const label = membershipLabel(status);

  return (
    <div className="mb-8 text-center">
      <p className="text-zinc-400 text-sm">Membership status</p>
      <p className="font-semibold">{label}</p>
    </div>
  );
}
