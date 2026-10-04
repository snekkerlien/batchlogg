"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { deleteUserData } from "../../../../lib/supabase/deleteUserData";

export async function deleteAdminUser(userId: string) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user: adminUser },
    error: authError,
  } = await supabase.auth.getUser();

  const role = authError ? "member" : await getMembershipRole(supabase, adminUser);
  if (!hasPermission(role, "manage_users")) {
    throw new Error("Forbidden");
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    throw new Error("Invalid user ID");
  }

  const { data: targetUser, error: targetUserError } =
    await serviceRole.auth.admin.getUserById(userId);
  if (targetUserError) {
    throw new Error(`Could not load user: ${targetUserError.message}`);
  }
  if (!targetUser.user) {
    throw new Error("User not found");
  }

  await deleteUserData(serviceRole, userId);

  const { error: deleteError } = await serviceRole.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw new Error(`Could not delete Auth user: ${deleteError.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}
