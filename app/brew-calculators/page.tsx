import { redirect } from "next/navigation";
import CalculatorClient from "./CalculatorClient";
import { hasPremiumAccess } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";

export default async function BrewCalculatorsPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  if (!(await hasPremiumAccess(serviceRole, user.id))) redirect("/premium");
  return <CalculatorClient />;
}
