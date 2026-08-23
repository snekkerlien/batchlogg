export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import Link from "next/link";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

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
    .select("id, username, is_public")
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
    .filter((p) => p.id !== user.id)
    .filter((p) => p.is_public === true);

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

        <h1 className="text-4xl font-bold text-center mt-20 sm:mt-6 mb-6">
          Profiles
        </h1>

        <p className="opacity-80 text-center mb-10">
          Select a user to view their vessels and active batches.
        </p>

        <div className="max-w-xl mx-auto space-y-4">
          {otherProfiles.length > 0 ? (
            otherProfiles.map((p) => (
              <Link
                key={p.id}
                href={`/profiles/${p.username}`}
                className="block border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4 font-semibold text-center"
              >
                {p.username
                  ? p.username.charAt(0).toUpperCase() + p.username.slice(1)
                  : "Unknown user"}
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">No public users found.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
