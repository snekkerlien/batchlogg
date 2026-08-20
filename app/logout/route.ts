export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);

  // Logg ut bruker
  await supabase.auth.signOut();

  // Redirect til login
  const res = new NextResponse(null, { status: 302 });

  // Kopier Set-Cookie headers (sb-access-token + sb-refresh-token slettes)
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  // Redirect
  res.headers.append("Location", "/auth/login");

  return res;
}
