"use client";

import { useAuthContext } from "./AuthProvider";

export function useAuth() {
  const { user, loading } = useAuthContext();
  return { user, loading };
}
