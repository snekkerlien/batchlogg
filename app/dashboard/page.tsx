export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-6 text-white">
      <DashboardClient />
    </main>
  );
}
