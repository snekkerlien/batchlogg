import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const { id } = await req.json();

  const { supabase } = supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch vessel ID before deleting
  const { data: batchToDelete } = await supabase
    .from("batches")
    .select("aktivt_kar")
    .eq("id", id)
    .maybeSingle();

  // Delete batch
  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Revalidate dashboard + vessel card
  revalidatePath("/dashboard");

  if (batchToDelete?.aktivt_kar) {
    revalidatePath(`/kar/${batchToDelete.aktivt_kar}`);
  }

  return NextResponse.json({ success: true });
}
