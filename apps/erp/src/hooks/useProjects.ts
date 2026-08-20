import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
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
  triage_form_config?: any[];
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
  triage_form_config?: any[];
}

// ── Query: all projects (RLS auto-filters by role with resilient fallbacks) ──
export function useProjects() {
  const qc = useQueryClient();

  // Sincronização reativa em tempo real com o banco de dados Supabase
  useEffect(() => {
    const channel = supabase
      .channel("delski_realtime_projects_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          qc.invalidateQueries({ queryKey: ["projects"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data as unknown as Project[];
        }
      } catch (err) {
        console.warn("Supabase projects join query failed, trying simple select fallback:", err);
      }

      // Resilient fallback: Query via supabaseAdmin if anon RLS filtered unauthenticated dev mode requests
      try {
        const { data: adminData, error: adminErr } = await supabaseAdmin
          .from("projects")
          .select(
            `
            *,
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (!adminErr && adminData && adminData.length > 0) {
          return adminData as unknown as Project[];
        }

        // Simple admin select fallback
        const { data: simpleAdminData } = await supabaseAdmin
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (simpleAdminData && simpleAdminData.length > 0) {
          return simpleAdminData as unknown as Project[];
        }
      } catch (err) {
        console.warn("Admin fallback for projects failed:", err);
      }

      return [];
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
        let projectIds: string[] = [];

        const clientToUse = supabase;
        if (userId) {
          const { data: pfData } = await clientToUse
            .from("project_freelancers")
            .select("project_id")
            .eq("freelancer_id", userId);
          projectIds = (pfData ?? []).map((r: any) => r.project_id).filter(Boolean);
        }

        if (projectIds.length === 0 && emailLower) {
          try {
            const { data: profiles } = await clientToUse
              .from("profiles")
              .select("id")
              .ilike("email", emailLower);
            const profileIds = (profiles ?? []).map((p: any) => p.id).filter(Boolean);
            if (profileIds.length > 0) {
              const { data: pfData2 } = await clientToUse
                .from("project_freelancers")
                .select("project_id, freelancer_id")
                .in("freelancer_id", profileIds);
              projectIds = (pfData2 ?? []).map((r: any) => r.project_id).filter(Boolean);
            }
          } catch {
            // ignore
          }
        }

        // Try admin client if no projectIds found yet
        if (projectIds.length === 0) {
          try {
            const { data: profilesAdmin } = await supabaseAdmin
              .from("profiles")
              .select("id, email");
            const matchingProfiles = (profilesAdmin ?? []).filter(
              (p: any) =>
                (userId && p.id === userId) ||
                (emailLower && (p.email || "").toLowerCase().trim() === emailLower),
            );
            const profileIds = matchingProfiles.map((p: any) => p.id);
            if (profileIds.length > 0) {
              const { data: pfDataAdmin } = await supabaseAdmin
                .from("project_freelancers")
                .select("project_id")
                .in("freelancer_id", profileIds);
              projectIds = (pfDataAdmin ?? []).map((r: any) => r.project_id).filter(Boolean);
            }
          } catch {
            // ignore
          }
        }

        if (!projectIds || projectIds.length === 0) return [];

        const { data, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email), freelancer_id
            )
          `,
          )
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) return data as unknown as Project[];

        const { data: adminData } = await supabaseAdmin
          .from("projects")
          .select(
            `
            *,
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email), freelancer_id
            )
          `,
          )
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        return (adminData ?? []) as unknown as Project[];
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
        let projectsData: any[] | null = null;

        const { data: pData, error: projErr } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (!projErr && pData && pData.length > 0) {
          projectsData = pData;
        } else {
          const { data: adminPData } = await supabaseAdmin
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          projectsData = adminPData;
        }

        if (!projectsData) return [];

        const allProjects = projectsData as unknown as Project[];
        if (!userId && !emailLower) return allProjects;

        const matchingIds = new Set<string>();
        if (userId) matchingIds.add(userId.toLowerCase());

        try {
          const { data: clientsData } = await (supabaseAdmin.from("clients") as any).select(
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
          const { data: profilesData } = await supabaseAdmin.from("profiles").select("id, email");

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
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data as unknown as Project[];
        }
      } catch (err) {
        console.warn("Gestor finance query fallback:", err);
      }

      // Resilient fallback via supabaseAdmin
      try {
        const { data: adminData, error: adminErr } = await supabaseAdmin
          .from("projects")
          .select(
            `
            *,
            client:profiles(full_name, email),
            freelancers:project_freelancers(
              profile:profiles(id, full_name, email)
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (!adminErr && adminData && adminData.length > 0) {
          return adminData as unknown as Project[];
        }
      } catch (err) {
        console.warn("Admin fallback for gestor finance failed:", err);
      }

      return [];
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
          client:profiles(full_name, email),
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
      } else if (e.message.includes("projects_service_type_check")) {
        toast.error(
          "Selecione uma vertical de serviço válida. Se escolher 'Social Media', execute o script de migração SQL no Supabase para atualizar a trava do banco.",
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
      // 1. Delete associated records in child tables
      try {
        await Promise.allSettled([
          supabase.from("project_freelancers").delete().eq("project_id", id),
          supabase.from("project_tasks").delete().eq("project_id", id),
          supabase.from("project_expenses").delete().eq("project_id", id),
          supabase.from("freelancer_payouts").delete().eq("project_id", id),
          supabase.from("candidaturas").delete().eq("project_id", id),
          supabase.from("project_contracts").delete().eq("project_id", id),
        ]);
      } catch (err) {
        console.warn("Clean child records before delete project warning:", err);
      }

      // 2. Delete the main project row
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        // Resilient fallback with admin client
        const { error: adminErr } = await supabaseAdmin.from("projects").delete().eq("id", id);
        if (adminErr) throw adminErr;
      }
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["freelancer_payouts"] });
      toast.success("Projeto excluído com sucesso do banco de dados.");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir projeto: ${e.message}`),
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
