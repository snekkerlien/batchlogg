import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = "mads@snekkerlien.no";

export function isAdminUser(user: User | null) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}
