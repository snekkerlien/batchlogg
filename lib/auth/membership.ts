export const MEMBERSHIP_STATUSES = [
  "member",
  "supporter",
  "beta-tester",
  "early-adopter",
  "founder",
  "contributor",
  "verified-brewer",
  "pro-brewer",
  "brewery",
  "partner",
  "sponsor",
  "moderator",
  "admin",
] as const;

export type MembershipStatusValue = (typeof MEMBERSHIP_STATUSES)[number];

const LABELS: Record<MembershipStatusValue, string> = {
  member: "Member",
  supporter: "Supporter",
  "beta-tester": "Beta Tester",
  "early-adopter": "Early Adopter",
  founder: "Founder",
  contributor: "Contributor",
  "verified-brewer": "Verified Brewer",
  "pro-brewer": "Pro Brewer",
  brewery: "Brewery",
  partner: "Partner",
  sponsor: "Sponsor",
  moderator: "Moderator",
  admin: "Admin",
};

export function isMembershipStatus(value: unknown): value is MembershipStatusValue {
  return typeof value === "string" && (MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}

export function membershipLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && isMembershipStatus(trimmed) ? LABELS[trimmed] : "Member";
}
