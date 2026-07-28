import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskStatus = "Pendente" | "Em andamento" | "Em revisao" | "Concluida";

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  phase: string | null;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  predecessor_id: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  phase?: string;
  status?: TaskStatus;
  start_date?: string;
  due_date?: string;
  predecessor_id?: string;
}

// ── Query: tasks for a project ────────────────────────────────────────────────
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ["project_tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectTask[];
    },
  });
}

// ── Mutation: create task ─────────────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectTask;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["project_tasks", d.project_id] });
      toast.success("Tarefa criada!");
    },
    onError: (e: Error) => toast.error(`Erro ao criar tarefa: ${e.message}`),
  });
}

// ── Mutation: update task status with dependency validation ────────────────────
export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, projectId, newStatus, tasks }: { taskId: string; projectId: string; newStatus: TaskStatus; tasks: ProjectTask[] }) => {
      const target = tasks.find((t) => t.id === taskId);
      if (!target) throw new Error("Tarefa não encontrada.");

      // Check predecessor requirement
      if (newStatus !== "Pendente" && target.predecessor_id) {
        const predecessor = tasks.find((t) => t.id === target.predecessor_id);
        if (predecessor && predecessor.status !== "Concluida") {
          throw new Error(`Dependência não concluída: a tarefa "${predecessor.title}" precisa ser concluída antes.`);
        }
      }

      const { data, error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["project_tasks", res.projectId] });
      toast.success("Status da tarefa atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Mutation: delete task ─────────────────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["project_tasks", projectId] });
      toast.success("Tarefa removida.");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
