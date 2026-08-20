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
    async function loadSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    }

    loadSession();

    // Lytt på endringer i session
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
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
