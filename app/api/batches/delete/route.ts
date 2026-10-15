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
  const { data: batchToDelete, error: lookupError } = await supabase
    .from("batches")
    .select("id, aktivt_kar")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!batchToDelete) {
    return NextResponse.json({ error: "Batch not found or access denied" }, { status: 404 });
  }

  // Delete batch
  const { data: deleted, error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ error: "Batch could not be deleted" }, { status: 403 });
  }

  // Revalidate dashboard + vessel card
  revalidatePath("/dashboard");

  if (batchToDelete?.aktivt_kar) {
    revalidatePath(`/kar/${batchToDelete.aktivt_kar}`);
  }

  return NextResponse.json({ success: true });
}
