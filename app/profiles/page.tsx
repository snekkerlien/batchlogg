export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import Link from "next/link";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import ProfilesList from "./ProfilesList"; // ← NY

export default async function ProfilesPage() {
  const { supabase } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">You must be logged in</h1>
      </main>
    );
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, is_public, avatar_url")
    .order("username", { ascending: true });

  if (profilesError) {
    return (
      <main className="min-h-screen flex items-center justify-center text-red-400">
        <h1 className="text-2xl font-bold">
          Error fetching profiles: {profilesError.message}
        </h1>
      </main>
    );
  }

  const otherProfiles = (profiles ?? [])
    .filter((p) => p.is_public === true);

  // ← NY: hent favoritter
  const { data: favorites } = await supabase
    .from("profile_favorites")
    .select("favorite_profile_id")
    .eq("user_id", user.id);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-0">

        {/* MENU BUTTON */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        {/* BACK BUTTON */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold text-center mt-20 sm:mt-6 mt-6">
          Community
        </h1>

        <p className="opacity-80 text-center mb-10 mt-6">
          Explore the community and follow other brewers’ journeys.
        </p>

        {/* ← NY: søk + liste */}
        <ProfilesList profiles={otherProfiles} favorites={favorites} />

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
