import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "gestor" | "freelancer" | "cliente";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  session: Session | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    loading: true,
    session: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.warn("[useAuth] Profile not found, defaulting to gestor for demo:", error.message);
      return null;
    }
    return data as UserProfile;
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          role: (profile?.role as UserRole) ?? "gestor",
          loading: false,
          session,
        });
      } else {
        setState({ user: null, profile: null, role: null, loading: false, session: null });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          role: (profile?.role as UserRole) ?? "gestor",
          loading: false,
          session,
        });
      } else {
        setState({ user: null, profile: null, role: null, loading: false, session: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, role: null, loading: false, session: null });
  }, []);

  return {
    ...state,
    isGestor: state.role === "gestor",
    isFreelancer: state.role === "freelancer",
    isCliente: state.role === "cliente",
    isAuthenticated: !!state.user,
    logout,
  };
}
