"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";

type AuthContextType = {
  user: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      const { data, error } = await supabaseBrowser.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.session.user);
      setLoading(false);
    }

    syncSession();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
