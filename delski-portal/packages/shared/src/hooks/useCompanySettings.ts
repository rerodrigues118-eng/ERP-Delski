import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/hooks/useContractFieldResolver";

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async (): Promise<CompanySettings> => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return DEFAULT_COMPANY_SETTINGS;
      }

      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...data,
      } as CompanySettings;
    },
  });
}

export function useUpsertCompanySettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CompanySettings>) => {
      const payload = {
        id: 1,
        ...DEFAULT_COMPANY_SETTINGS,
        ...input,
      };

      const { data, error } = await supabase
        .from("company_settings")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Dados da empresa salvos.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível salvar os dados da empresa.");
    },
  });
}
