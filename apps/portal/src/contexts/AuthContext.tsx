import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = "gestor" | "freelancer" | "cliente" | "admin" | string;

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: string | null;
  isLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  isGestor: boolean;
  isFreelancer: boolean;
  isCliente: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  loading: true,
  signOut: async () => {},
  logout: async () => {},
  isGestor: false,
  isFreelancer: false,
  isCliente: false,
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchFullNameFromMetadata = (u: User) => {
      const metadata = u.user_metadata as Record<string, unknown> | undefined;
      const fullNameMetadata =
        typeof metadata?.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name.trim()
          : undefined;
      const nameMetadata =
        typeof metadata?.name === "string" && metadata.name.trim() ? metadata.name.trim() : undefined;
      const preferredNameMetadata =
        typeof metadata?.preferred_name === "string" && metadata.preferred_name.trim()
          ? metadata.preferred_name.trim()
          : undefined;
      const givenNameMetadata =
        typeof metadata?.given_name === "string" && metadata.given_name.trim()
          ? metadata.given_name.trim()
          : undefined;

      return (
        fullNameMetadata ||
        nameMetadata ||
        preferredNameMetadata ||
        givenNameMetadata ||
        u.email?.split("@")[0] ||
        "Usuário"
      );
    };

    const fetchProfile = async (u: User) => {
      try {
        const normalizedEmail = u.email?.trim().toLowerCase() || "";
        const metadataFullName = fetchFullNameFromMetadata(u);

        // 1. Check profile by ID (user.id)
        const { data: byId } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle();

        if (byId) {
          if (isMounted) {
            setProfile(byId as UserProfile);
            setRole(byId.role);
          }
          return;
        }

        // 2. Check profile by Email
        if (normalizedEmail) {
          const { data: byEmail } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", normalizedEmail)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (byEmail) {
            if (isMounted) {
              const profileWithId = { ...byEmail, id: u.id, auth_user_id: u.id };
              setProfile(profileWithId as UserProfile);
              setRole(byEmail.role);
            }
            return;
          }
        }

        // 3. Fallback: Default profile object
        const metaRole = (u.user_metadata?.role as string) || "gestor";
        const fallbackProfile: UserProfile = {
          id: u.id,
          full_name: metadataFullName,
          email: u.email || "",
          role: metaRole,
          created_at: new Date().toISOString(),
        };
        if (isMounted) {
          setProfile(fallbackProfile);
          setRole(metaRole);
        }
      } catch (error) {
        console.warn("[AuthContext] Error retrieving profile:", error);
        const metaRole = (u.user_metadata?.role as string) || "gestor";
        if (isMounted) {
          setProfile({
            id: u.id,
            full_name: fetchFullNameFromMetadata(u),
            email: u.email || "",
            role: metaRole,
            created_at: new Date().toISOString(),
          });
          setRole(metaRole);
        }
      }
    };

    // 1. Pega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          fetchProfile(session.user).finally(() => {
            if (isMounted) setIsLoading(false);
          });
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    }).catch((err) => {
      console.warn("[AuthContext] Failed to get session:", err);
      if (isMounted) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    // 2. Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setIsLoading(true);
          fetchProfile(newSession.user).finally(() => {
            if (isMounted) setIsLoading(false);
          });
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // OBRIGATÓRIO: Array de dependências vazio

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setIsLoading(false);
    }
  };

  const roleLower = (role || "").toLowerCase();
  const isGestor =
    roleLower === "gestor" ||
    roleLower === "admin" ||
    roleLower === "manager" ||
    roleLower === "administrator";
  const isFreelancer = roleLower === "freelancer";
  const isCliente = roleLower === "cliente" || roleLower === "client";
  const isAuthenticated = !isLoading && !!session && !!user;

  const value = React.useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      isLoading,
      loading: isLoading,
      signOut,
      logout: signOut,
      isGestor,
      isFreelancer,
      isCliente,
      isAuthenticated,
    }),
    [session, user, profile, role, isLoading, isGestor, isFreelancer, isCliente, isAuthenticated, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
