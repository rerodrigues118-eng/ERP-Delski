import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import type { ContractModel } from "@/types/contract-models";

export interface ContractTemplateUploadResult {
  path: string;
  publicUrl: string | null;
}

export function useContractModels() {
  return useQuery({
    queryKey: ["contract_models"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("contract_models")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data as ContractModel[];
        }
      } catch {
        // Fallback
      }

      try {
        const { data: adminData } = await supabaseAdmin
          .from("contract_models")
          .select("*")
          .order("created_at", { ascending: false });

        return (adminData ?? []) as ContractModel[];
      } catch (err) {
        console.warn("Error fetching contract_models via admin fallback:", err);
        return [];
      }
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

export async function generateContractClientSide(payload: {
  docx_path: string;
  values: Record<string, unknown>;
  filename?: string;
  model_id?: string;
  project_id?: string;
  freelancer_id?: string;
}): Promise<GeneratedContractResponse> {
  const { docx_path, values, filename, model_id, project_id, freelancer_id } = payload;

  // 1. Download .docx template from 'contract-templates' bucket
  const { data: blob, error: downloadError } = await supabase.storage
    .from("contract-templates")
    .download(docx_path);

  if (downloadError || !blob) {
    throw new Error(
      `Erro ao baixar o modelo de contrato (.docx): ${downloadError?.message || "Arquivo de template não encontrado no Storage."}`,
    );
  }

  const arrayBuffer = await blob.arrayBuffer();

  // 2. Render .docx with PizZip + Docxtemplater or string replacement
  let outputBuffer: Uint8Array;
  try {
    const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
      import("pizzip"),
      import("docxtemplater"),
    ]);

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    doc.setData(values);
    doc.render();
    outputBuffer = doc.getZip().generate({ type: "uint8array" });
  } catch (renderError: any) {
    console.warn("[Docx Client Render Fallback]", renderError);

    // Fallback: search and replace XML strings directly
    const { default: PizZip } = await import("pizzip");
    const zip = new PizZip(arrayBuffer);
    const xmlFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("word/") && name.endsWith(".xml"),
    );

    const keys = Object.keys(values).sort((a, b) => b.length - a.length);
    for (const fileName of xmlFiles) {
      const file = zip.file(fileName);
      if (!file) continue;
      let content = file.asText();
      let changed = false;
      for (const key of keys) {
        const placeholder = `{{${key}}}`;
        if (!content.includes(placeholder)) continue;
        const val = String(values[key] ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        content = content.split(placeholder).join(val);
        changed = true;
      }
      if (changed) zip.file(fileName, content);
    }
    outputBuffer = zip.generate({ type: "uint8array" });
  }

  // 3. Upload generated .docx to 'contract-generated' bucket
  const fileName = filename || docx_path.split("/").pop() || "contrato_gerado.docx";
  const normalizedBaseName = fileName.replace(/\.docx$/i, "").replace(/\.pdf$/i, "");
  const outputDocxPath = `generated/${Date.now()}_${normalizedBaseName}.docx`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("contract-generated")
    .upload(outputDocxPath, outputBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

  if (uploadError || !uploadData) {
    throw new Error(
      `Erro ao salvar contrato gerado no Storage: ${uploadError?.message || "Upload falhou."}`,
    );
  }

  // 4. Get Public URL
  const { data: urlData } = supabase.storage
    .from("contract-generated")
    .getPublicUrl(outputDocxPath);
  const publicUrl = urlData?.publicUrl || null;

  // 5. Save row into 'generated_contracts' table in Supabase
  let generatedRecord: any = null;
  if (model_id && project_id) {
    try {
      const { data: inserted, error: insertError } = await (
        supabase.from("generated_contracts") as any
      )
        .insert({
          model_id,
          project_id,
          freelancer_id: freelancer_id || null,
          values,
          docx_path: outputDocxPath,
          pdf_path: null,
          status: "rascunho",
        })
        .select()
        .single();

      if (!insertError) {
        generatedRecord = inserted;
      }
    } catch (e) {
      console.warn("Save generated_contracts row error:", e);
    }
  }

  return {
    docx_path: outputDocxPath,
    docx_url: publicUrl,
    pdf_path: null,
    public_url: publicUrl,
    generated_record: generatedRecord,
    status: "rascunho",
  };
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
      try {
        const response = await fetch("/api/contract-models/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          return data as GeneratedContractResponse;
        }
      } catch (e) {
        console.warn("API route unavailable, executing client-side generation:", e);
      }

      // Client-side fallback: direct Supabase + docxtemplater processing
      return await generateContractClientSide(payload);
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
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.warn("Erro ao atualizar modelo com patch completo, tentando sem contract_type:", error.message);
        const { contract_type, ...cleanPatch } = patch as any;
        const { data: data2, error: error2 } = await supabase
          .from("contract_models")
          .update(cleanPatch)
          .eq("id", id)
          .select()
          .single();

        if (error2) throw error2;
        return data2 as ContractModel;
      }

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
