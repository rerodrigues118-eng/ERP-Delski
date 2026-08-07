import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/hooks/useContractFieldResolver";

const STORAGE_KEY = "delski_company_settings";

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async (): Promise<CompanySettings> => {
      let localSaved: Partial<CompanySettings> = {};
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localSaved = JSON.parse(raw);
        } catch {
          // Fallback
        }
      }

      try {
        const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
        if (!error && data) {
          return {
            ...DEFAULT_COMPANY_SETTINGS,
            ...localSaved,
            ...data,
          } as CompanySettings;
        }
      } catch (err) {
        console.warn("Using local company settings fallback:", err);
      }

      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...localSaved,
      };
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

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Fallback
        }
      }

      try {
        const { data, error } = await supabase
          .from("company_settings")
          .upsert(payload, { onConflict: "id" })
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as CompanySettings;
        }
      } catch (err) {
        console.warn("Saved to local storage, DB error bypassed:", err);
      }

      return payload as CompanySettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Dados da empresa e padrões do sistema salvos!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível salvar os dados da empresa.");
    },
  });
}
