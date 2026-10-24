import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!hasPermission(await getMembershipRole(supabase, user), "manage_users")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: recipe, error: recipeError } = await serviceRole
    .from("recipes")
    .select("id, user_id, name")
    .eq("id", params.id)
    .eq("is_public", true)
    .maybeSingle();
  if (recipeError) {
    console.error("Could not load public recipe for moderation", recipeError);
    return NextResponse.json({ error: "Could not remove public recipe." }, { status: 500 });
  }
  if (!recipe) {
    return NextResponse.json({ error: "Public recipe not found." }, { status: 404 });
  }

  const { data: updatedRecipe, error: updateError } = await serviceRole
    .from("recipes")
    .update({ is_public: false })
    .eq("id", recipe.id)
    .eq("is_public", true)
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("Could not remove recipe from public listings", updateError);
    return NextResponse.json({ error: "Could not remove public recipe." }, { status: 500 });
  }
  if (!updatedRecipe) {
    return NextResponse.json({ error: "Public recipe not found." }, { status: 404 });
  }

  const auditWritten = await writeAdminAuditEvent(serviceRole, {
    actorId: user.id,
    action: "public_recipe.unpublished",
    targetType: "recipe",
    targetId: recipe.id,
    details: {
      ownerId: recipe.user_id,
      recipeName: recipe.name,
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/members/[username]", "page");
  revalidatePath("/members/[username]/recipes/[recipeId]", "page");

  return NextResponse.json({
    success: true,
    ...(!auditWritten
      ? {
          warning:
            "The recipe was removed from public listings, but the admin audit log could not be updated.",
        }
      : {}),
  });
}
