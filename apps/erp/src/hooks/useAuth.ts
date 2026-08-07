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
      if (
        byId.full_name?.trim() &&
        !byId.full_name.includes("@") &&
        byId.full_name !== user.email?.split("@")[0]
      ) {
        return byId as UserProfile;
      }

      try {
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("full_name")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        if (clientByEmail?.full_name?.trim()) {
          const realName = clientByEmail.full_name.split("(")[0].trim();
          await (supabase.from("profiles") as any)
            .update({ full_name: realName })
            .eq("id", user.id);
          byId.full_name = realName;
        }
      } catch (err) {
        console.warn("[useAuth] RLS permission check failed:", err);
      }
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

      let clientName = metadataFullName;
      try {
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("full_name")
          .ilike("email", normalizedEmail)
          .limit(1)
          .maybeSingle();
        if (clientByEmail?.full_name) {
          clientName = clientByEmail.full_name.split("(")[0].trim();
        }
      } catch (err) {
        console.warn("[useAuth] RLS permission check failed:", err);
      }

      return {
        id: user.id,
        full_name: clientName || metadataFullName,
        email: user.email || "",
        role: (user.user_metadata?.role as string) || "cliente",
      } as UserProfile;
    }

    // 3. Fallback: Default profile object
    const metaRole = (user.user_metadata?.role as string) || "gestor";
    return {
      id: user.id,
      full_name: metadataFullName,
      email: user.email || "",
      role: metaRole,
    } as UserProfile;
  } catch (error) {
    console.warn("[useAuth] Error retrieving profile from database:", error);
    return null;
  }
};

let isAuthInitialized = false;

function initAuthSingleton() {
  if (isAuthInitialized) return;
  isAuthInitialized = true;

  const updateStateFromSession = async (session: Session | null) => {
    if (session?.user) {
      const profile = await fetchProfileFromDatabase(session.user);
      const rawRole = (profile?.role || session.user.user_metadata?.role || "gestor").toString();
      globalAuthState = {
        user: session.user,
        profile,
        role: rawRole,
        loading: false,
        session,
      };
    } else {
      globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
    }
    notify();
  };

  supabase.auth.getSession().then(({ data: { session } }) => {
    updateStateFromSession(session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    updateStateFromSession(session);
  });
}

if (typeof window !== "undefined") {
  initAuthSingleton();
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const logout = useCallback(async () => {
    globalAuthState = { ...globalAuthState, loading: true };
    notify();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
    }
    globalAuthState = { user: null, profile: null, role: null, loading: false, session: null };
    notify();
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
