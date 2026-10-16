import type { Metadata } from "next";
import ABVToolsClient from "./ABVToolsClient";

export const metadata: Metadata = {
  title: "ABV Calculator & Brewing Tools",
  description:
    "Free brewing calculators for ABV, dilution, target strength, original gravity, and sugar or honey requirements.",
  alternates: { canonical: "/abv-tools" },
};

export default function ABVToolsPage() {
  return <ABVToolsClient />;
}
