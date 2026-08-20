import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);
  const form = await req.formData();

  const karId = form.get("kar_id") as string;

  // Hent session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect("https://batchlogg.vercel.app/auth/login");
  }

  // Slett karet (kun hvis det tilhører brukeren)
  await supabase
    .from("kar")
    .delete()
    .eq("id", karId)
    .eq("user_id", user.id);

  // Redirect tilbake til dashboard
  const res = new NextResponse(null, {
    status: 302,
    headers: {
      Location: "https://batchlogg.vercel.app/dashboard",
    },
  });

  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  return res;
}
