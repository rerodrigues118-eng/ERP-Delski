import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProjectStatus = "Solicitado" | "Delegado" | "Em Producao" | "Em Revisao" | "Concluido";
export type ServiceType = "IA" | "Trafego" | "Sites";

export interface Project {
  id: string;
  title: string;
  client_id: string | null;
  service_type: ServiceType;
  status: ProjectStatus;
  budget: number;
  freelancer_cost: number;
  deadline: string | null;
  briefing_content: string | null;
  google_drive_link: string | null;
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
}

// ── Query: all projects (RLS auto-filters by role) ──────────────────────────
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          client:profiles!projects_client_id_fkey(full_name, email),
          freelancers:project_freelancers(
            profile:profiles(id, full_name, email)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Project[];
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
        .select(`
          *,
          client:profiles!projects_client_id_fkey(full_name, email),
          freelancers:project_freelancers(
            profile:profiles(id, full_name, email)
          )
        `)
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
      const { data, error } = await supabase
        .from("projects")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado com sucesso!");
    },
    onError: (e: Error) => {
      if (e.message.includes("infinite recursion")) {
        toast.error("Erro RLS do Supabase (recursão infinita). Por favor, execute o arquivo supabase/schema.sql atualizado no SQL Editor do Supabase!");
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
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreateProjectInput> & { status?: ProjectStatus; google_drive_link?: string; briefing_content?: string } }) => {
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
    mutationFn: async ({ projectId, freelancerId }: { projectId: string; freelancerId: string }) => {
      // Remove existing then insert
      await supabase.from("project_freelancers").delete().eq("project_id", projectId);
      const { error } = await supabase.from("project_freelancers").insert({ project_id: projectId, freelancer_id: freelancerId });
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
