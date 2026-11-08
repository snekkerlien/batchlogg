import type { Metadata } from "next";
import ABVToolsClient from "./ABVToolsClient";

export const metadata: Metadata = {
  title: "Brewing Calculators",
  description:
    "Free brewing calculators for ABV, dilution, target strength, original gravity, bottle counts, all-grain water planning, and water chemistry.",
  alternates: { canonical: "/abv-tools" },
};

export default function ABVToolsPage() {
  return <ABVToolsClient />;
}
