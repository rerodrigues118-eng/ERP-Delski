import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContractModel } from "@/types/contract-models";

export interface ContractTemplateUploadResult {
  path: string;
  publicUrl: string | null;
}

export function useContractModels() {
  return useQuery({
    queryKey: ["contract_models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_models")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractModel[];
    },
  });
}

export function useContractModel(id: string) {
  return useQuery({
    queryKey: ["contract_model", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_models")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ContractModel;
    },
  });
}

export function useUploadContractTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const filePath = `templates/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("contract-templates")
        .upload(filePath, file, { contentType: file.type });

      if (error || !data) {
        throw error ?? new Error("Erro ao enviar modelo de contrato.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("contract-templates")
        .getPublicUrl(data.path);

      return {
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      } as ContractTemplateUploadResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_models"] });
    },
  });
}

export function useExtractContractVariables() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/contract-models/extract-variables", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Erro ao extrair variáveis do arquivo .docx");
      }

      const data = await response.json();
      return data.variables as string[];
    },
  });
}

export interface ContractTemplatePreviewResult {
  html: string;
}

export function usePreviewContractTemplate() {
  return useMutation({
    mutationFn: async (docx_path: string) => {
      const response = await fetch("/api/contract-models/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docx_path }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Erro ao gerar pré-visualização do template.");
      }

      const data = await response.json();
      return data as ContractTemplatePreviewResult;
    },
  });
}

export interface GeneratedContractResponse {
  docx_path: string;
  docx_url: string | null;
  pdf_path: string | null;
  public_url: string | null;
  generated_record: unknown;
  status: string;
}

export function useGenerateContract() {
  return useMutation({
    mutationFn: async (payload: {
      docx_path: string;
      values: Record<string, unknown>;
      filename?: string;
      model_id?: string;
      project_id?: string;
      freelancer_id?: string;
    }) => {
      const response = await fetch("/api/contract-models/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const detail = data?.detail ? `: ${data.detail}` : "";
        throw new Error((data?.message ?? "Erro ao gerar contrato.") + detail);
      }

      const data = await response.json();
      return data as GeneratedContractResponse;
    },
  });
}

export function useCreateContractModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<ContractModel, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("contract_models")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ContractModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_models"] });
    },
  });
}

export function useUpdateContractModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<ContractModel, "id"> &
        Partial<Omit<ContractModel, "id" | "created_at" | "updated_at">>,
    ) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from("contract_models")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ContractModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_models"] });
    },
  });
}

export function useToggleContractModelActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("contract_models")
        .update({ is_active: isActive })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ContractModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_models"] });
    },
  });
}

export function useDeleteContractModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_models").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_models"] });
    },
  });
}
