import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProjectStatus, ServiceType } from "@/mocks/types";
export type { ProjectStatus, ServiceType };

export interface Project {
  id: string;
  title: string;
  client_id: string | null;
  service_type: ServiceType;
  status: ProjectStatus;
  budget: number;
  freelancer_cost: number;
  additional_costs?: number;
  deadline: string | null;
  briefing_content: string | null;
  google_drive_link: string | null;
  public_token?: string | null;
  client_contract_url?: string | null;
  contract_field_values?: Record<string, string>;
  contract_fields_status?: "pendente" | "completo";
  created_at: string;
  // joined
  client?: { full_name: string; email: string } | null;
  freelancers?: { id: string; full_name: string; email: string }[];
}

export interface CreateProjectInput {
  title: string;
  service_type: ServiceType;
  status?: ProjectStatus;
  budget: number;
  freelancer_cost: number;
  deadline?: string;
  briefing_content?: string;
  client_id?: string;
  public_token?: string;
  client_contract_path?: string;
  client_contract_url?: string;
  contract_field_values?: Record<string, string>;
  contract_fields_status?: "pendente" | "completo";
}

// ── Query: all projects (RLS auto-filters by role with resilient fallbacks) ──
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            client:profiles!projects_client_id_fkey(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as unknown as Project[];
      } catch (err) {
        console.warn("Supabase projects join query failed, trying simple select fallback:", err);
        try {
          const { data: simpleData, error: simpleErr } = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          if (!simpleErr && simpleData && simpleData.length > 0) {
            return simpleData as unknown as Project[];
          }
        } catch (err) {
          console.warn("Fallback simple select failed:", err);
        }

        return [];
      }
    },
  });
}

// ── Strict RBAC Isolated Query: Freelancer Finance Projects ──────────────────
export function useFreelancerFinanceProjects(userId?: string, userEmail?: string) {
  const emailLower = userEmail?.toLowerCase().trim() || "";
  return useQuery({
    queryKey: ["finance", "freelancer", userId || emailLower],
    enabled: !!(userId || emailLower),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        // Prefer server-side filtering: fetch project IDs from join table
        let projectIds: string[] = [];

        // If we have a userId, query project_freelancers directly
        if (userId) {
          const { data: pfData, error: pfErr } = await supabase
            .from("project_freelancers")
            .select("project_id")
            .eq("freelancer_id", userId);

          if (pfErr) throw pfErr;
          projectIds = (pfData ?? []).map((r: any) => r.project_id).filter(Boolean);
        }

        // If no projectIds yet but we have an email, try to resolve profile id(s) by email
        if (projectIds.length === 0 && emailLower) {
          try {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id")
              .ilike("email", emailLower);
            const profileIds = (profiles ?? []).map((p: any) => p.id).filter(Boolean);
            if (profileIds.length > 0) {
              const { data: pfData2, error: pfErr2 } = await supabase
                .from("project_freelancers")
                .select("project_id, freelancer_id")
                .in("freelancer_id", profileIds);
              if (pfErr2) throw pfErr2;
              projectIds = (pfData2 ?? []).map((r: any) => r.project_id).filter(Boolean);
            }
          } catch {
            // ignore
          }
        }

        // If no project IDs found, return empty list early
        if (!projectIds || projectIds.length === 0) return [];

        // Fetch projects restricted to the resolved project IDs, including joins
        const { data, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            client:profiles!projects_client_id_fkey(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email), freelancer_id
            )
          `,
          )
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as unknown as Project[];
      } catch (err) {
        console.warn("Freelancer finance query fallback:", err);
        return [];
      }
    },
  });
}

// ── Strict RBAC Isolated Query: Client Finance Projects ──────────────────────
export function useClienteFinanceProjects(userId?: string, userEmail?: string) {
  const emailLower = userEmail?.toLowerCase().trim() || "";
  return useQuery({
    queryKey: ["finance", "cliente", userId || emailLower],
    enabled: !!(userId || emailLower),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        // 1. Query all projects from Supabase
        const { data: projectsData, error: projErr } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projErr || !projectsData) {
          return [];
        }

        const allProjects = projectsData as unknown as Project[];
        if (!userId && !emailLower) return allProjects;

        // 2. Resolve all client IDs linked to this user (from clients and profiles tables)
        const matchingIds = new Set<string>();
        if (userId) matchingIds.add(userId.toLowerCase());

        try {
          const { data: clientsData } = await (supabase.from("clients") as any).select(
            "id, auth_user_id, email",
          );

          (clientsData ?? []).forEach((c: any) => {
            const cEmail = (c.email || "").toLowerCase().trim();
            const cAuthId = (c.auth_user_id || "").toLowerCase();
            const cId = (c.id || "").toLowerCase();

            if (
              (userId && (cId === userId.toLowerCase() || cAuthId === userId.toLowerCase())) ||
              (emailLower && cEmail === emailLower)
            ) {
              if (c.id) matchingIds.add(c.id.toLowerCase());
              if (c.auth_user_id) matchingIds.add(c.auth_user_id.toLowerCase());
            }
          });
        } catch {
          // Ignore
        }

        try {
          const { data: profilesData } = await supabase.from("profiles").select("id, email");

          (profilesData ?? []).forEach((p: any) => {
            const pEmail = (p.email || "").toLowerCase().trim();
            const pId = (p.id || "").toLowerCase();

            if ((userId && pId === userId.toLowerCase()) || (emailLower && pEmail === emailLower)) {
              if (p.id) matchingIds.add(p.id.toLowerCase());
            }
          });
        } catch {
          // Ignore
        }

        // 3. Filter projects matching any resolved client ID or matching client email
        return allProjects.filter((p: any) => {
          const pClientId = (p.client_id || "").toLowerCase();
          const pClientEmail = (p.client_email || p.client?.email || "").toLowerCase().trim();

          const matchId = pClientId && matchingIds.has(pClientId);
          const matchEmail = emailLower && pClientEmail === emailLower;

          return matchId || matchEmail;
        });
      } catch (err) {
        console.warn("Client finance query fallback:", err);
        return [];
      }
    },
  });
}

// ── Strict RBAC Isolated Query: Gestor Corporate Finance ─────────────────────
export function useGestorFinanceProjects() {
  return useQuery({
    queryKey: ["finance", "gestor"],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            client:profiles!projects_client_id_fkey(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as unknown as Project[];
      } catch (err) {
        console.warn("Gestor finance query fallback:", err);
        return [];
      }
    },
  });
}

// ── Query: single project ────────────────────────────────────────────────────
export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          client:profiles!projects_client_id_fkey(full_name, email),
          freelancers:project_freelancers(
            profile:profiles(id, full_name, email)
          )
        `,
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
  });
}

// ── Mutation: create project ─────────────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase.from("projects").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado com sucesso!");
    },
    onError: (e: Error) => {
      if (e.message.includes("infinite recursion")) {
        toast.error(
          "Erro RLS do Supabase (recursão infinita). Por favor, execute o arquivo supabase/schema.sql atualizado no SQL Editor do Supabase!",
        );
      } else {
        toast.error(`Erro ao criar projeto: ${e.message}`);
      }
    },
  });
}

// ── Mutation: update project ─────────────────────────────────────────────────
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CreateProjectInput> & {
        status?: ProjectStatus;
        google_drive_link?: string;
        briefing_content?: string;
      };
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", v.id] });
      toast.success("Projeto atualizado!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ── Mutation: delete project ─────────────────────────────────────────────────
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido.");
    },
  });
}

// ── Mutation: assign freelancer ──────────────────────────────────────────────
export function useAssignFreelancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      freelancerId,
    }: {
      projectId: string;
      freelancerId: string;
    }) => {
      // Remove existing then insert
      await supabase.from("project_freelancers").delete().eq("project_id", projectId);
      const { error } = await supabase
        .from("project_freelancers")
        .insert({ project_id: projectId, freelancer_id: freelancerId });
      if (error) throw error;
      // Update project cost from freelancer profile or keep manual
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["project", v.projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Freelancer atribuído!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
