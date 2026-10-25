import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import AuditLogClient from "./AuditLogClient";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "user.updated": "Updated user account",
  "user.email_updated": "Updated user email",
  "user.username_updated": "Updated username",
  "user.deleted": "Deleted user account",
  "user.restriction_applied": "Applied user restriction",
  "user.restriction_removed": "Removed user restriction",
  "user.warning_issued": "Issued community warning",
  "forum.content_removed": "Removed forum content",
  "forum.content_hidden": "Hid forum content",
  "forum.content_restored": "Restored forum content",
  "community_report.status_updated": "Updated community report",
  "community_report.content_removed": "Removed reported content",
  "community_report.claimed": "Assigned community report",
  "community_report.released": "Released community report",
  "community_report.note_updated": "Updated private moderation notes",
  "community_report.warning": "Issued community warning",
  "community_report.mute": "Applied community posting mute",
  "community_report.content_hidden": "Hid reported forum content",
  "community_report.content_restored": "Restored reported forum content",
  "community_report.escalated": "Escalated community report",
  "community_report.appeal_submitted": "Submitted community moderation appeal",
  "community_report.appeal_upheld": "Upheld community moderation action appeal",
  "community_report.appeal_overturned": "Overturned community moderation action appeal",
  "roadmap.status_updated": "Updated roadmap entry",
  "roadmap.entry_removed": "Removed completed roadmap entry",
  "changelog.saved": "Saved a release note",
  "changelog.removed": "Removed a release note",
  "announcement.created": "Created announcement",
  "announcement.removed": "Removed announcement",
  "feedback.status_updated": "Updated feedback status",
  "feedback.deleted": "Deleted feedback",
  "feedback.added_to_roadmap": "Added feedback to roadmap",
  "maintenance_notice.updated": "Updated maintenance notice",
  "analytics.sponsor_link_created": "Created sponsor analytics link",
  "analytics.sponsor_link_revoked": "Revoked sponsor analytics link",
  "analytics.sponsor_link_deleted": "Deleted sponsor analytics link",
  "brewery.approve": "Approved brewery account",
  "brewery.reject": "Rejected brewery account",
  "brewery.suspend": "Suspended brewery account",
  "brewery.grant": "Granted complimentary brewery access",
  "brewery.revoke_grant": "Revoked complimentary brewery access",
  "brewery.review_report_updated": "Moderated brewery product review",
  "business.manual_account_created": "Created business page with complimentary access",
  "business.access_granted": "Granted complimentary business access",
  "business.access_revoked": "Revoked complimentary business access",
};

function describeDetails(details: Record<string, unknown> | null) {
  if (!details) return null;
  return Object.entries(details)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
    .join(" · ");
}

export default async function AuditLogPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  const { data: events, error } = await serviceRole
    .from("admin_audit_log")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const actorIds = [...new Set((events ?? []).flatMap((event) => event.actor_id ? [event.actor_id] : []))];
  const { data: profiles, error: profilesError } = actorIds.length
    ? await serviceRole.from("profiles").select("id, username").in("id", actorIds)
    : { data: [], error: null };
  const actorNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  const auditEvents = (events ?? []).map((event) => ({
    id: event.id,
    actor_name: event.actor_id
      ? actorNames.get(event.actor_id) || "Deleted admin"
      : "Deleted admin",
    action: event.action,
    action_label: ACTION_LABELS[event.action] ?? event.action,
    target_type: event.target_type,
    target_id: event.target_id,
    details: describeDetails(event.details),
    created_at: event.created_at,
  }));

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>
        <PageHeading
          title="Audit log"
          subtitle="Review recent administrative actions."
        />

        {error || profilesError ? (
          <p role="alert" className="text-center text-red-300">
            The audit log could not be loaded.
          </p>
        ) : (
          <AuditLogClient events={auditEvents} />
        )}
      </div>
    </main>
  );
}
