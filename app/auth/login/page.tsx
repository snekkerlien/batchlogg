export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import LoginClient from "./LoginClient";

export default async function Page() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <LoginClient />;
}
