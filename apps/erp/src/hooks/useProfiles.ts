import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  auth_user_id?: string | null;
  role: "gestor" | "freelancer" | "cliente";
  created_at: string;
  contract_fields_status?: "pendente" | "completo";
  documents_status?: "pendente" | "em_analise" | "aprovado" | "rejeitado";
  contract_field_values?: Record<string, string>;
}

// ── Fetch freelancers from database ──────────────────────────────────────────
export function useFreelancers() {
  return useQuery({
    queryKey: ["freelancers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "freelancer")
        .order("full_name", { ascending: true });
      if (error) throw error;

      const { data: freelancerRows } = await (supabase.from("freelancers") as any).select("*");
      const { data: docsRows } = await (supabase.from("freelancer_documents") as any).select(
        "freelancer_id, status",
      );

      const freelancerMap = new Map<string, any>();
      (freelancerRows ?? []).forEach((row: any) => freelancerMap.set(row.id, row));

      const docsCountMap = new Map<string, number>();
      (docsRows ?? []).forEach((d: any) => {
        docsCountMap.set(d.freelancer_id, (docsCountMap.get(d.freelancer_id) || 0) + 1);
      });

      // Deduplicate profiles by email to link manual creation with auth login
      const uniqueByEmailMap = new Map<string, any>();

      (profiles ?? []).forEach((p: any) => {
        const emailKey = (p.email || "").toLowerCase().trim();
        const extra = freelancerMap.get(p.id);
        const docsCount = docsCountMap.get(p.id) || 0;

        const candidate = {
          ...p,
          contract_fields_status: extra?.contract_fields_status ?? "pendente",
          documents_status: extra?.documents_status ?? (docsCount > 0 ? "em_analise" : "pendente"),
          contract_field_values: extra?.contract_field_values ?? {},
          docsCount,
        };

        if (!uniqueByEmailMap.has(emailKey)) {
          uniqueByEmailMap.set(emailKey, candidate);
        } else {
          const existing = uniqueByEmailMap.get(emailKey);
          if (
            (candidate.documents_status !== "pendente" &&
              existing.documents_status === "pendente") ||
            (candidate.contract_fields_status === "completo" &&
              existing.contract_fields_status !== "completo") ||
            candidate.docsCount > existing.docsCount
          ) {
            uniqueByEmailMap.set(emailKey, candidate);
          }
        }
      });

      return Array.from(uniqueByEmailMap.values()) as Profile[];
    },
  });
}

// ── Fetch clients from database ──────────────────────────────────────────────
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const { data: clientsData } = await (supabase.from("clients") as any)
          .select("*")
          .order("full_name", { ascending: true });

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "cliente")
          .order("full_name", { ascending: true });

        const profileByEmail = new Map<string, any>();
        (profilesData ?? []).forEach((p: any) => {
          profileByEmail.set((p.email || "").toLowerCase().trim(), p);
        });

        const map = new Map<string, Profile>();

        (clientsData ?? []).forEach((c: any) => {
          const resolvedProfileId =
            c.auth_user_id || profileByEmail.get((c.email || "").toLowerCase().trim())?.id || c.id;

          map.set(resolvedProfileId, {
            id: resolvedProfileId,
            auth_user_id: c.auth_user_id || resolvedProfileId,
            full_name: c.company_name ? `${c.full_name} (${c.company_name})` : c.full_name,
            email: c.email,
            role: "cliente",
            created_at: c.created_at,
          });
        });

        (profilesData ?? []).forEach((p: any) => {
          if (!map.has(p.id)) {
            map.set(p.id, p as Profile);
          }
        });

        return Array.from(map.values());
      } catch (err) {
        console.warn("Error fetching clients list:", err);
        return [];
      }
    },
  });
}

// ── Fetch all profiles (Gestor only) ──────────────────────────────────────────
export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}
