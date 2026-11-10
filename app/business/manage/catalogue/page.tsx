import BreweryCatalogueClient from "@/app/business/manage/catalogue/BreweryCatalogueClient";
import { requireVisibleFeature } from "@/lib/features/server";

export const dynamic = "force-dynamic";

export default async function BreweryCataloguePage() {
  await requireVisibleFeature("business-accounts");
  return <BreweryCatalogueClient />;
}
