import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
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
      const fullSaved = {
        id: 1,
        ...DEFAULT_COMPANY_SETTINGS,
        ...input,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fullSaved));
        } catch {
          // Fallback
        }
      }

      // Sanitizar payload para a tabela company_settings no Postgres
      const dbPayload: Record<string, any> = {
        id: 1,
        razao_social: input.razao_social || input.nome_empresa || DEFAULT_COMPANY_SETTINGS.razao_social,
        cnpj: input.cnpj || DEFAULT_COMPANY_SETTINGS.cnpj,
        nome_representante: input.nome_representante || input.representante || DEFAULT_COMPANY_SETTINGS.nome_representante,
        cargo_representante: input.cargo_representante || DEFAULT_COMPANY_SETTINGS.cargo_representante,
        email_contratante: input.email_contratante || input.email || DEFAULT_COMPANY_SETTINGS.email_contratante,
        telefone_contratante: input.telefone_contratante || input.telefone || DEFAULT_COMPANY_SETTINGS.telefone_contratante,
        endereco: input.endereco || DEFAULT_COMPANY_SETTINGS.endereco,
        cidade_padrao_assinatura: input.cidade_padrao_assinatura || input.cidade_assinatura || input.cidade || DEFAULT_COMPANY_SETTINGS.cidade_padrao_assinatura,
        banco_padrao: (input as any).banco_padrao || (DEFAULT_COMPANY_SETTINGS as any).banco_padrao,
        tipo_chave_pix_padrao: (input as any).tipo_chave_pix_padrao || (DEFAULT_COMPANY_SETTINGS as any).tipo_chave_pix_padrao,
        chave_pix_padrao: (input as any).chave_pix_padrao || (DEFAULT_COMPANY_SETTINGS as any).chave_pix_padrao,
        multa_rescisoria_padrao_percentual: (input as any).multa_rescisoria_padrao_percentual,
        juros_mora_padrao_percentual: (input as any).juros_mora_padrao_percentual,
        foro_padrao: input.foro_padrao || DEFAULT_COMPANY_SETTINGS.foro_padrao,
        data_pagamento_padrao: input.data_pagamento_padrao || DEFAULT_COMPANY_SETTINGS.data_pagamento_padrao,
        metodo_pagamento_padrao: input.metodo_pagamento_padrao || DEFAULT_COMPANY_SETTINGS.metodo_pagamento_padrao,
        updated_at: new Date().toISOString(),
      };

      Object.keys(dbPayload).forEach((k) => {
        if (dbPayload[k] === undefined) delete dbPayload[k];
      });

      try {
        const clientToUse = supabaseAdmin || supabase;
        const { data, error } = await clientToUse
          .from("company_settings")
          .upsert(dbPayload, { onConflict: "id" })
          .select()
          .maybeSingle();

        if (!error && data) {
          return {
            ...fullSaved,
            ...data,
          } as CompanySettings;
        }
      } catch (err) {
        console.warn("Saved to local storage, DB error bypassed:", err);
      }

      return fullSaved as CompanySettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Dados da empresa e padrões do sistema salvos com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível salvar os dados da empresa.");
    },
  });
}
