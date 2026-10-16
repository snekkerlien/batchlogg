import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isSponsorAnalyticsTokenValid } from "@/lib/analytics/sponsorShare";
import { AdminAnalyticsClient } from "@/app/admin/analytics/AdminAnalyticsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Batchlogg community overview",
  robots: { index: false, follow: false },
};

export default async function SponsorAnalyticsPage({
  params,
}: {
  params: { token: string };
}) {
  const { serviceRole } = supabaseServer();
  if (!(await isSponsorAnalyticsTokenValid(serviceRole, params.token))) notFound();
  return <AdminAnalyticsClient sponsorToken={params.token} />;
}
