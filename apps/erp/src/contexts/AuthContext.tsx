import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = "gestor" | "freelancer" | "cliente" | "admin" | string;

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
}

const getLocalAvatar = (userId?: string): string => {
  if (typeof window === "undefined" || !userId) return "";
  try {
    const direct = localStorage.getItem(`delski_avatar_${userId}`);
    if (direct) return direct;
  } catch (e) {}
  return "";
};

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

const MOCK_PROFILE: UserProfile = {
  id: "dev-gestor-id",
  full_name: "Gestor Delski (Dev)",
  email: "gestor@delski.co",
  role: "gestor",
  created_at: new Date().toISOString(),
};

const MOCK_USER = {
  id: "dev-gestor-id",
  email: "gestor@delski.co",
  app_metadata: {},
  user_metadata: { full_name: "Gestor Delski (Dev)", role: "gestor" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

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

        const localAvatar = getLocalAvatar(u.id);

        // 1. Check profile by ID (user.id)
        const { data: byId } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle();

        if (byId) {
          if (isMounted) {
            // DB avatar_url is the source of truth for this user (isolated by user.id)
            // Only fall back to metadata or localStorage if DB has no avatar
            const avatar =
              byId.avatar_url ||
              (u.user_metadata as any)?.avatar_url ||
              undefined;
            setProfile({ ...byId, avatar_url: avatar } as UserProfile);
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
              // DB avatar_url is source of truth — user is now linked by auth ID
              const avatar =
                byEmail.avatar_url ||
                (u.user_metadata as any)?.avatar_url ||
                undefined;
              const profileWithId = { ...byEmail, avatar_url: avatar, id: u.id, auth_user_id: u.id };
              setProfile(profileWithId as UserProfile);
              setRole(byEmail.role);
            }
            return;
          }
        }

        // 3. Fallback: Default profile object
        const metaRole = (u.user_metadata?.role as string) || "gestor";
        const avatar = (u.user_metadata as any)?.avatar_url || localAvatar || undefined;
        const fallbackProfile: UserProfile = {
          id: u.id,
          full_name: metadataFullName,
          email: u.email || "",
          role: metaRole,
          avatar_url: avatar,
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

    const handleSession = (s: Session | null) => {
      if (!isMounted) return;
      if (s?.user) {
        setIsDevMode(false);
        setSession(s);
        setUser(s.user);
        fetchProfile(s.user).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setSession(null);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginDevMode = React.useCallback((devRole: string = "gestor") => {
    setIsDevMode(true);
    setUser({
      ...MOCK_USER,
      user_metadata: { full_name: `Gestor Delski (Dev)`, role: devRole },
    } as User);
    setProfile({
      ...MOCK_PROFILE,
      role: devRole,
    });
    setRole(devRole);
    setIsLoading(false);
  }, []);

  const signOut = React.useCallback(async () => {
    setIsLoading(true);
    setIsDevMode(false);
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
  }, []);

  const effectiveUser = user || (isDevMode ? MOCK_USER : null);
  const effectiveProfile = profile || (isDevMode ? MOCK_PROFILE : null);
  const effectiveRole = role || effectiveProfile?.role || (isDevMode ? "gestor" : null);
  const roleLower = (effectiveRole || "").toLowerCase();

  const isGestor =
    roleLower === "gestor" ||
    roleLower === "admin" ||
    roleLower === "manager" ||
    roleLower === "administrator";
  const isFreelancer = roleLower === "freelancer";
  const isCliente = roleLower === "cliente" || roleLower === "client";
  const isAuthenticated = !isLoading && (isDevMode || (!!session && !!user));

  const value = React.useMemo(
    () => ({
      session,
      user: effectiveUser,
      profile: effectiveProfile,
      role: effectiveRole,
      isLoading,
      loading: isLoading,
      signOut,
      logout: signOut,
      loginDevMode,
      isGestor,
      isFreelancer,
      isCliente,
      isAuthenticated,
    }),
    [session, effectiveUser, effectiveProfile, effectiveRole, isLoading, loginDevMode, isGestor, isFreelancer, isCliente, isAuthenticated, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
