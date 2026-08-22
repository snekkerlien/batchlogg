import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function GET() {
  const { supabase } = supabaseServer();

  const { data: batches, error } = await supabase
    .from("batches")
    .select("*");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(batches);
}
