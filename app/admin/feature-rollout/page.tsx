import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole } from "@/lib/auth/permissions";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import FeatureRolloutClient from "./FeatureRolloutClient";

export const dynamic = "force-dynamic";

export default async function FeatureRolloutPage() {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await getMembershipRole(supabase, user);

  if (role !== "developer") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to developers.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute right-4 top-3 z-40">
          <MenuOverlay current="admin" />
        </div>
        <div className="absolute left-4 top-3 z-40">
          <BackButton />
        </div>

        <h1 className="text-3xl font-bold mb-2">Feature Rollout</h1>
        <p className="text-white/60 mb-8">
          Control when these features are released to other users. Developers can access
          them for testing while they are disabled.
        </p>

        <FeatureRolloutClient />
      </div>
    </main>
  );
}
