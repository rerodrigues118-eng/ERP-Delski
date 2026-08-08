import { useSyncExternalStore, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "gestor" | "freelancer" | "cliente" | "admin" | string;

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
  role: string | null;
  loading: boolean;
  session: Session | null;
}

let globalAuthState: AuthState = {
  user: null,
  profile: null,
  role: null,
  loading: true,
  session: null,
};

let fetchedProfileUserId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return globalAuthState;
}

const fetchFullNameFromMetadata = (user: User) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
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
    user.email?.split("@")[0] ||
    "Usuário"
  );
};

const fetchProfileFromDatabase = async (user: User): Promise<UserProfile | null> => {
  try {
    const normalizedEmail = user.email?.trim().toLowerCase() || "";
    const metadataFullName = fetchFullNameFromMetadata(user);

    // 1. Check profile by ID (user.id)
    const { data: byId } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (byId) {
      return byId as UserProfile;
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
        return { ...byEmail, id: user.id, auth_user_id: user.id } as UserProfile;
      }
    }

    // 3. Fallback: Default profile object
    const metaRole = (user.user_metadata?.role as string) || "gestor";
    return {
      id: user.id,
      full_name: metadataFullName,
      email: user.email || "",
      role: metaRole,
      created_at: new Date().toISOString(),
    } as UserProfile;
  } catch (error) {
    console.warn("[useAuth] Error retrieving profile from database (RLS/network):", error);
    return {
      id: user.id,
      full_name: fetchFullNameFromMetadata(user),
      email: user.email || "",
      role: (user.user_metadata?.role as string) || "gestor",
      created_at: new Date().toISOString(),
    } as UserProfile;
  }
};

let isAuthInitialized = false;

function initAuthSingleton() {
  if (isAuthInitialized) return;
  isAuthInitialized = true;

  // Initial fast session fetch
  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      const user = session?.user ?? null;
      const rawRole = (user?.user_metadata?.role || "gestor").toString();
      
      globalAuthState = {
        user,
        profile: globalAuthState.profile,
        role: user ? rawRole : null,
        loading: false,
        session: session ?? null,
      };
      notify();

      if (user && fetchedProfileUserId !== user.id) {
        fetchedProfileUserId = user.id;
        fetchProfileFromDatabase(user)
          .then((profile) => {
            if (profile) {
              globalAuthState = {
                ...globalAuthState,
                profile,
                role: (profile.role || globalAuthState.role || "gestor").toString(),
              };
              notify();
            }
          })
          .catch((err) => {
            console.warn("[useAuth] Background profile fetch failed:", err);
          });
      }
    })
    .catch((err) => {
      console.warn("[useAuth] getSession failed:", err);
      globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
      notify();
    });

  // Auth state change listener
  supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      const user = session?.user ?? null;
      if (user) {
        const rawRole = (user.user_metadata?.role || "gestor").toString();
        const userChanged = globalAuthState.user?.id !== user.id;

        globalAuthState = {
          user,
          profile: userChanged ? null : globalAuthState.profile,
          role: rawRole,
          loading: false,
          session,
        };
        notify();

        if (fetchedProfileUserId !== user.id) {
          fetchedProfileUserId = user.id;
          const profile = await fetchProfileFromDatabase(user);
          if (profile) {
            globalAuthState = {
              ...globalAuthState,
              profile,
              role: (profile.role || globalAuthState.role || "gestor").toString(),
            };
            notify();
          }
        }
      } else {
        fetchedProfileUserId = null;
        globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
        notify();
      }
    } catch (err) {
      console.error("[useAuth] Error in onAuthStateChange:", err);
      globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
      notify();
    } finally {
      if (globalAuthState.loading) {
        globalAuthState = { ...globalAuthState, loading: false };
        notify();
      }
    }
  });
}

if (typeof window !== "undefined") {
  initAuthSingleton();
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const logout = useCallback(async () => {
    fetchedProfileUserId = null;
    globalAuthState = { ...globalAuthState, loading: true };
    notify();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
      notify();
    }
  }, []);

  const roleLower = (state.role || "").toLowerCase();
  const isGestor =
    roleLower === "gestor" ||
    roleLower === "admin" ||
    roleLower === "manager" ||
    roleLower === "administrator";
  const isFreelancer = roleLower === "freelancer";
  const isCliente = roleLower === "cliente" || roleLower === "client";

  return {
    ...state,
    isGestor,
    isFreelancer,
    isCliente,
    isAuthenticated: !!state.user,
    logout,
  };
}
