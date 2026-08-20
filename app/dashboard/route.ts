import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function GET(request: NextRequest) {
  const { supabase } = createRouteHandlerClient(request);

  // Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect("/auth/login");
  }

  // Username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Kar
  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  const username = profile?.username ?? "Ukjent";

  // Returner HTML direkte
  return new NextResponse(`
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="UTF-8" />
      <title>Dashboard</title>
      <link rel="stylesheet" href="/globals.css" />
    </head>
    <body class="min-h-screen flex flex-col items-center justify-center px-6">

      <div class="absolute top-4 right-4">
        <form action="/logout" method="post">
          <button class="px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-800 rounded-lg font-semibold">
            Logg ut
          </button>
        </form>
      </div>

      <div class="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 text-center">

        <h1 class="text-2xl font-bold mb-4">
          Logget inn som ${username}
        </h1>

        <p class="opacity-80 mb-8 text-lg">
          Velkommen tilbake til bryggeriet, kompis 🍻
        </p>

        <a
          href="/profiles"
          class="inline-block mb-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        <div class="grid grid-cols-3 gap-4 justify-items-center max-w-[420px] mx-auto">
          ${kar
            ?.map(
              (k: any) => `
            <a
              href="/kar/${k.id}"
              class="relative border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition flex flex-col items-center w-28 h-28"
            >
              <span class="absolute top-[10px] text-lg font-bold text-green-300">
                ${k.navn.replace("Kar ", "")}
              </span>

              <span class="text-zinc-400 mt-10">Ledig</span>
            </a>
          `
            )
            .join("")}
        </div>

        <p class="text-sm opacity-40 mt-12">
          © ${new Date().getFullYear()} Fiklebrygg. Alle rettigheters reservert.
        </p>
      </div>

    </body>
    </html>
  `, {
    headers: { "Content-Type": "text/html" },
  });
}
