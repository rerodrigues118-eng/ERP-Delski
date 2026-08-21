import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinancialTransaction, TransactionType, TransactionStatus } from "@/types/financial-transactions";
import { useSales } from "./useSales";

export function useFinancialTransactions() {
  const { data: sales = [] } = useSales();

  return useQuery<FinancialTransaction[]>({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("financial_transactions" as any)
          .select("*")
          .order("transaction_date", { ascending: false });

        if (error || !data || data.length === 0) {
          // If DB table is empty or pending migration, generate unified transactions from sales
          return sales.map((sale) => ({
            id: `ft-${sale.id}`,
            type: "income" as TransactionType,
            amount: Number(sale.amount) || 0,
            status: (sale.status === "concluida" ? "paid" : sale.status === "cancelada" ? "cancelled" : "pending") as TransactionStatus,
            category: "Vendas",
            description: `Venda - ${sale.client_name} (${sale.service_name})`,
            payment_method: sale.payment_terms || "À vista",
            sales_id: sale.id,
            project_id: null,
            transaction_date: sale.created_at.slice(0, 10),
            created_at: sale.created_at,
            updated_at: sale.updated_at,
          }));
        }

        return (data as unknown as FinancialTransaction[]).map((t) => ({
          ...t,
          amount: Number(t.amount) || 0,
        }));
      } catch (err) {
        console.warn("Falling back to sales-derived transactions:", err);
        return sales.map((sale) => ({
          id: `ft-${sale.id}`,
          type: "income" as TransactionType,
          amount: Number(sale.amount) || 0,
          status: (sale.status === "concluida" ? "paid" : sale.status === "cancelada" ? "cancelled" : "pending") as TransactionStatus,
          category: "Vendas",
          description: `Venda - ${sale.client_name} (${sale.service_name})`,
          payment_method: sale.payment_terms || "À vista",
          sales_id: sale.id,
          project_id: null,
          transaction_date: sale.created_at.slice(0, 10),
          created_at: sale.created_at,
          updated_at: sale.updated_at,
        }));
      }
    },
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tx: Omit<FinancialTransaction, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("financial_transactions" as any)
        .insert([
          {
            ...tx,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn("Could not insert transaction in DB:", error);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}
