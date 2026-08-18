import { createServerActionClient } from "../../../lib/supabaseServerAction";

export async function GET(req: Request) {
  const supabase = await createServerActionClient();
  const url = new URL(req.url);
  const userId = url.searchParams.get("user");

  const { data } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  return Response.json(data ?? []);
}
