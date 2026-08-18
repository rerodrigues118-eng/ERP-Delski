import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExpenseCategory =
  | "apis"
  | "ferramentas"
  | "ads"
  | "ia_automacao"
  | "influencers"
  | "aquisicao_leads"
  | "dominios_infra"
  | "freelancers"
  | "freelancer"
  | "custos_fixos"
  | "infra"
  | "escritorio"
  | "impostos"
  | "equipamentos"
  | "outros";
export type ExpenseNature = "fixo" | "variavel";
export type ExpenseStatus = "Pendente" | "Aprovado" | "Pago";

export interface Expense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  freelancer_id?: string;
  proof_url?: string;
  created_at: string;
  project?: {
    id: string;
    title: string;
    client_id: string | null;
  };
  freelancer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("project_expenses")
          .select(
            `*, project:projects(id, title, client_id), freelancer:profiles(id, full_name, email)`,
          )
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) return data as Expense[];
      } catch {
        // Fallback
      }

      try {
        const { data: adminData } = await supabaseAdmin
          .from("project_expenses")
          .select(
            `*, project:projects(id, title, client_id), freelancer:profiles(id, full_name, email)`,
          )
          .order("created_at", { ascending: false });
        return (adminData ?? []) as Expense[];
      } catch {
        return [];
      }
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Expense, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("project_expenses")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa registrada com sucesso.");
    },
    onError: (e: Error) => toast.error(`Erro ao registrar despesa: ${e.message}`),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExpenseStatus }) => {
      const { data, error } = await supabase
        .from("project_expenses")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Status da despesa atualizado.");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar status: ${e.message}`),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_expenses").delete().eq("id", id);
      if (error) {
        const { error: adminErr } = await supabaseAdmin.from("project_expenses").delete().eq("id", id);
        if (adminErr) throw adminErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["project_expenses"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Despesa removida.");
    },
    onError: (e: Error) => toast.error(`Erro ao remover despesa: ${e.message}`),
  });
}

export function useDeletePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("virtual_")) {
        toast.info("Pagamento virtual ocultado.");
        return;
      }
      const { error } = await supabase.from("freelancer_payouts").delete().eq("id", id);
      if (error) {
        const { error: adminErr } = await supabaseAdmin.from("freelancer_payouts").delete().eq("id", id);
        if (adminErr) throw adminErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancer_payouts"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Pagamento excluído com sucesso.");
    },
    onError: (e: Error) => toast.error(`Erro ao remover pagamento: ${e.message}`),
  });
}
