import { useAuth as useAuthFromContext } from "@/contexts/AuthContext";
export type { UserRole, UserProfile } from "@/contexts/AuthContext";

export function useAuth() {
  return useAuthFromContext();
}
