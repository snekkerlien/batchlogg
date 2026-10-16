import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuditEvent = {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, string | number | boolean | null>;
};

export async function writeAdminAuditEvent(
  serviceRole: SupabaseClient,
  event: AdminAuditEvent
): Promise<boolean> {
  const { error } = await serviceRole.from("admin_audit_log").insert({
    actor_id: event.actorId,
    action: event.action,
    target_type: event.targetType,
    target_id: event.targetId ?? null,
    details: event.details ?? {},
  });

  if (error) {
    console.error("Could not record admin action in audit log", {
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId ?? null,
      error,
    });
    return false;
  }

  return true;
}
