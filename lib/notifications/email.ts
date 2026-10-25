import type { SupabaseClient } from "@supabase/supabase-js";

type StaffNotification = {
  subject: string;
  text: string;
  path: string;
};

async function getDeveloperEmails(serviceRole: SupabaseClient) {
  const profileIds: string[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("id")
      .eq("membership_status", "developer")
      .range(from, from + 999);
    if (error) {
      throw new Error(`Could not load notification recipients: ${error.message}`);
    }
    profileIds.push(...(data ?? []).map((profile) => profile.id));
    if (!data || data.length < 1000) break;
  }

  const remainingIds = new Set(profileIds);
  if (remainingIds.size === 0) return [];

  const emails = new Set<string>();
  for (let page = 1; remainingIds.size > 0; page += 1) {
    const { data, error } = await serviceRole.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      throw new Error(`Could not load notification recipient emails: ${error.message}`);
    }
    for (const user of data.users) {
      if (!remainingIds.has(user.id)) continue;
      remainingIds.delete(user.id);
      if (user.email) emails.add(user.email);
    }
    if (data.users.length < 1000) break;
  }

  return [...emails];
}

export async function sendStaffNotification(
  serviceRole: SupabaseClient,
  notification: StaffNotification
) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true") return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured");
  }

  const recipients = await getDeveloperEmails(serviceRole);
  if (recipients.length === 0) {
    throw new Error("No Developer accounts with email addresses were found");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://batchlogg.vercel.app")
    .replace(/\/+$/, "");
  const text = `${notification.text}\n\nReview: ${appUrl}${notification.path}`;

  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: notification.subject,
          text,
        }),
      });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        throw new Error(`Resend rejected an email (${response.status}): ${details}`);
      }
    })
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new Error(
      `Could not deliver notification to ${failures.length} of ${recipients.length} staff recipients`
    );
  }
}
