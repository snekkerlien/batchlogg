import { createServerActionClient } from "../../../lib/supabaseServerAction";

export async function GET() {
  const supabase = await createServerActionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Response.json({ user });
}
