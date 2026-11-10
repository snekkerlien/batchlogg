import BreweryAnalyticsClient from "@/app/business/manage/analytics/BreweryAnalyticsClient";
import { requireVisibleFeature } from "@/lib/features/server";

export const dynamic = "force-dynamic";

export default async function BreweryAnalyticsPage() {
  await requireVisibleFeature("business-accounts");
  return <BreweryAnalyticsClient />;
}
