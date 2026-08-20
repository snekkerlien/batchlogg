import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);

  // Logg ut bruker
  await supabase.auth.signOut();

  // Redirect til login
  const res = new NextResponse(null, {
    status: 302,
    headers: {
      Location: "https://batchlogg.vercel.app/auth/login",
    },
  });

  // Sett cookies riktig
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  return res;
}
