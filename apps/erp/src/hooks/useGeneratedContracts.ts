import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GeneratedContract } from "@/types/contract-models";

export interface GeneratedContractWithRelations extends GeneratedContract {
  project?: { id: string; title: string } | null;
  freelancer?: { id: string; full_name: string; email?: string } | null;
  model?: { id: string; name: string } | null;
}

export function useGeneratedContracts() {
  return useQuery<GeneratedContractWithRelations[]>({
    queryKey: ["generated_contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_contracts")
        .select(
          `
          *,
          project:projects(id, title),
          freelancer:profiles(id, full_name, email),
          model:contract_models(id, name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("generated_contracts relation query failed, falling back to raw list", error);
        const fallback = await supabase
          .from("generated_contracts")
          .select("*")
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []) as GeneratedContractWithRelations[];
      }

      return (data ?? []) as GeneratedContractWithRelations[];
    },
  });
}
