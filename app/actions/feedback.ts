"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { sendStaffNotification } from "@/lib/notifications/email";

const FEEDBACK_CATEGORIES = ["feedback", "suggestion", "bug"] as const;

export async function submitFeedback(formData: FormData) {
  const { supabase, serviceRole } = supabaseServer();

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Extract fields
  const category = formData.get("category")?.toString() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";

  // Validate
  if (!FEEDBACK_CATEGORIES.some((value) => value === category)) {
    throw new Error("Choose a valid category");
  }
  if (message.length < 3 || message.length > 3000) {
    throw new Error("Write between 3 and 3000 characters");
  }

  // Fetch username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // Insert feedback
  const { error } = await serviceRole
    .from("feedback")
    .insert({
      user_id: user.id,
      username: profile?.username ?? null,
      email: user.email ?? null,
      category,
      message,
    });

  if (error) throw new Error(`Could not send feedback: ${error.message}`);

  let notificationSent = true;
  try {
    await sendStaffNotification(serviceRole, {
      subject: `New ${category} submission`,
      text: `From: ${profile?.username ?? user.email ?? "A member"}\nEmail: ${user.email ?? "Not provided"}\n\n${message}`,
      path: "/admin/feedback",
    });
  } catch (notificationError) {
    notificationSent = false;
    console.error("Feedback was saved but its email notification failed", notificationError);
  }

  return { notificationSent };
}
