import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = "gestor" | "freelancer" | "cliente" | "admin" | string;
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  cargo?: string;
  phone?: string;
  cpf_cnpj?: string;
  approval_status?: ApprovalStatus | string;
  onboarding_completed?: boolean;
  contract_field_values?: Record<string, any>;
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
  onboardingCompleted: boolean;
  approvalStatus: ApprovalStatus;
  isApproved: boolean;
  isPendingApproval: boolean;
  isRejected: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginDevMode: (devRole?: string) => void;
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
  onboardingCompleted: false,
  approvalStatus: "approved",
  isApproved: true,
  isPendingApproval: false,
  isRejected: false,
  signOut: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  loginDevMode: () => {},
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
  approval_status: "approved",
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

        // Check clients table for client data & status
        const { data: clientRow } = normalizedEmail
          ? await (supabase.from("clients") as any)
              .select("*")
              .or(`auth_user_id.eq.${u.id},email.ilike.${normalizedEmail}`)
              .limit(1)
              .maybeSingle()
          : { data: null };

        // Check freelancers table for freelancer data & status
        const { data: freelancerRow } = await (supabase.from("freelancers") as any)
          .select("*")
          .eq("id", u.id)
          .maybeSingle();

        if (
          byId?.status === "bloqueado" ||
          clientRow?.status === "bloqueado" ||
          freelancerRow?.status === "bloqueado"
        ) {
          await supabase.auth.signOut();
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setRole(null);
          }
          return;
        }

        const isOnboardingDone = Boolean(
          byId?.onboarding_completed ||
          clientRow?.onboarding_completed ||
          freelancerRow?.onboarding_completed
        );

        if (byId) {
          if (isMounted) {
            const avatar =
              byId.avatar_url ||
              (u.user_metadata as any)?.avatar_url ||
              undefined;
            setProfile({
              ...byId,
              avatar_url: avatar,
              onboarding_completed: isOnboardingDone,
            } as UserProfile);
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
              const avatar =
                byEmail.avatar_url ||
                (u.user_metadata as any)?.avatar_url ||
                undefined;
              const profileWithId = {
                ...byEmail,
                avatar_url: avatar,
                id: u.id,
                auth_user_id: u.id,
                onboarding_completed: isOnboardingDone || Boolean(byEmail.onboarding_completed),
              };
              setProfile(profileWithId as UserProfile);
              setRole(byEmail.role);
            }
            return;
          }
        }

        // 3. Fallback: Default profile object
        const metaRole = (u.user_metadata?.role as string) || (clientRow ? "cliente" : "gestor");
        const avatar = (u.user_metadata as any)?.avatar_url || localAvatar || undefined;
        const fallbackProfile: UserProfile = {
          id: u.id,
          full_name: metadataFullName,
          email: u.email || "",
          role: metaRole,
          avatar_url: avatar,
          onboarding_completed: isOnboardingDone,
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
            onboarding_completed: false,
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
      onboarding_completed: true,
    });
    setRole(devRole);
    setIsLoading(false);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        const normalizedEmail = (currentUser.email || "").trim().toLowerCase();

        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        const { data: clientRow } = normalizedEmail
          ? await (supabase.from("clients") as any)
              .select("*")
              .or(`auth_user_id.eq.${currentUser.id},email.ilike.${normalizedEmail}`)
              .limit(1)
              .maybeSingle()
          : { data: null };

        const isOnboardingDone = Boolean(dbProfile?.onboarding_completed || clientRow?.onboarding_completed);

        if (dbProfile) {
          const avatar = dbProfile.avatar_url || (currentUser.user_metadata as any)?.avatar_url || undefined;
          setProfile({
            ...dbProfile,
            avatar_url: avatar,
            onboarding_completed: isOnboardingDone,
          } as UserProfile);
          setRole(dbProfile.role);
        } else if (clientRow) {
          setProfile({
            id: currentUser.id,
            full_name: clientRow.full_name || clientRow.contact_name || "Cliente",
            email: clientRow.email || currentUser.email || "",
            role: "cliente",
            onboarding_completed: isOnboardingDone,
            created_at: clientRow.created_at,
          } as UserProfile);
          setRole("cliente");
        }
      }
    } catch (err) {
      console.warn("[AuthContext] refreshProfile error:", err);
    }
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
  const onboardingCompleted = isCliente
    ? Boolean(effectiveProfile?.onboarding_completed)
    : true;

  const rawApprovalStatus = effectiveProfile?.approval_status;
  const approvalStatus: ApprovalStatus =
    isGestor || isDevMode
      ? "approved"
      : rawApprovalStatus === "rejected"
      ? "rejected"
      : rawApprovalStatus === "pending"
      ? "pending"
      : "approved";

  const isApproved = approvalStatus === "approved";
  const isPendingApproval = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";

  const value = React.useMemo(
    () => ({
      session,
      user: effectiveUser,
      profile: effectiveProfile,
      role: effectiveRole,
      isLoading,
      loading: isLoading,
      onboardingCompleted,
      approvalStatus,
      isApproved,
      isPendingApproval,
      isRejected,
      signOut,
      logout: signOut,
      refreshProfile,
      loginDevMode,
      isGestor,
      isFreelancer,
      isCliente,
      isAuthenticated,
    }),
    [
      session,
      effectiveUser,
      effectiveProfile,
      effectiveRole,
      isLoading,
      onboardingCompleted,
      approvalStatus,
      isApproved,
      isPendingApproval,
      isRejected,
      loginDevMode,
      isGestor,
      isFreelancer,
      isCliente,
      isAuthenticated,
      signOut,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
