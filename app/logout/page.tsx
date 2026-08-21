"use client";

import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      await supabaseBrowser.auth.signOut();
      router.replace("/auth/login");
    }

    doLogout();
  }, [router]);

  return <p className="text-white p-10">Logger ut…</p>;
}
