import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractModels } from "@/hooks/useContractModels";
import type { ContractModelVariable } from "@/types/contract-models";
import { toast } from "sonner";

export type FreelancerDocumentType =
  | "documento_identidade_1"
  | "documento_identidade_2"
  | "rg_frente"
  | "rg_verso"
  | "cnh"
  | "comprovante_residencia"
  | "situacao_cadastral_cpf"
  | "certidao_antecedentes_criminais";

export interface FreelancerDocument {
  id: string;
  freelancer_id: string;
  document_type: FreelancerDocumentType;
  file_path: string;
  status: "pendente" | "aprovado" | "rejeitado";
  review_notes?: string | null;
  uploaded_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  public_url?: string | null;
}

export interface FreelancerContractInfo {
  id: string;
  contract_field_values: Record<string, string>;
  contract_fields_status: "pendente" | "completo";
  documents_status: "pendente" | "em_analise" | "aprovado" | "rejeitado";
}

// ── Hook: Deduplicated freelancer-origin contract variables across active models ──
export function useFreelancerContractVariables() {
  const { data: models = [] } = useContractModels();

  return useMemo(() => {
    const activeModels = models.filter((m) => m.is_active !== false);
    const mapByName = new Map<string, ContractModelVariable>();

    activeModels.forEach((model) => {
      let vars: ContractModelVariable[] = [];
      if (Array.isArray(model.variable_map)) {
        vars = model.variable_map;
      } else if (typeof model.variable_map === "string") {
        try {
          vars = JSON.parse(model.variable_map);
        } catch (err) {
          console.warn("Failed to parse contract model.variable_map:", err);
        }
      }

      vars.forEach((v) => {
        const originStr = v.origin?.toString().toLowerCase().trim();
        const normName = (v.name || "").toLowerCase().trim();
        const normLabel = (v.label || "").toLowerCase().trim();

        // Excluir campos financeiros/projeto que são específicos de cada projeto
        const isProjectPaymentField =
          normName.includes("mensalidade") ||
          normLabel.includes("mensalidade") ||
          normName.includes("data_pagamento") ||
          normLabel.includes("data pagamento") ||
          normName.includes("metodo_pagamento") ||
          normLabel.includes("metodo pagamento") ||
          normName.includes("forma_pagamento") ||
          normLabel.includes("forma pagamento");

        if (
          originStr === "freelancer" &&
          v.name &&
          !isProjectPaymentField &&
          !mapByName.has(v.name)
        ) {
          mapByName.set(v.name, v);
        }
      });
    });

    return Array.from(mapByName.values());
  }, [models]);
}

// ── Hook: Fetch freelancer contract info & status ──────────────────────────────
// Helper: Resolve all candidate profile IDs for a freelancer (handles manual + auth accounts)
export async function getRelatedFreelancerIds(freelancerId?: string): Promise<string[]> {
  if (!freelancerId) return [];

  try {
    const { data: mainProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", freelancerId)
      .maybeSingle();

    if (!mainProfile?.email) return [freelancerId];

    const { data: relatedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", mainProfile.email.trim());

    const ids = (relatedProfiles ?? []).map((p: any) => p.id);
    ids.push(freelancerId);
    return Array.from(new Set(ids));
  } catch (err) {
    console.warn("getRelatedFreelancerIds failed:", err);
    return [freelancerId];
  }
}

// ── Hook: Fetch freelancer contract info & status ──────────────────────────────
export function useFreelancerContractInfo(freelancerId?: string) {
  return useQuery({
    queryKey: ["freelancer_contract_info", freelancerId],
    enabled: !!freelancerId,
    queryFn: async (): Promise<FreelancerContractInfo> => {
      if (!freelancerId) {
        return {
          id: "",
          contract_field_values: {},
          contract_fields_status: "pendente",
          documents_status: "pendente",
        };
      }

      const candidateIds = await getRelatedFreelancerIds(freelancerId);

      const { data, error } = await (supabase.from("freelancers") as any)
        .select("*")
        .in("id", candidateIds);

      if (error) {
        console.warn("Erro ao buscar dados do freelancer em public.freelancers:", error);
      }

      const rows = data ?? [];
      const completedRow =
        rows.find((r: any) => r.contract_fields_status === "completo") || rows[0];

      if (!completedRow) {
        // Check if freelancer_documents has docs to infer status
        const { data: docs } = await (supabase.from("freelancer_documents") as any)
          .select("id")
          .in("freelancer_id", candidateIds);

        const hasDocs = (docs ?? []).length > 0;

        return {
          id: freelancerId,
          contract_field_values: {},
          contract_fields_status: "pendente",
          documents_status: hasDocs ? "em_analise" : "pendente",
        };
      }

      return {
        id: completedRow.id,
        contract_field_values: completedRow.contract_field_values ?? {},
        contract_fields_status: completedRow.contract_fields_status ?? "pendente",
        documents_status: completedRow.documents_status ?? "pendente",
      };
    },
  });
}

async function upsertFreelancerRecord(freelancerId: string, payload: Record<string, any>) {
  const candidateIds = await getRelatedFreelancerIds(freelancerId);

  for (const targetId of candidateIds) {
    const { data: existing } = await (supabase.from("freelancers") as any)
      .select("id")
      .eq("id", targetId)
      .maybeSingle();

    if (existing) {
      await (supabase.from("freelancers") as any).update(payload).eq("id", targetId);
    } else {
      await (supabase.from("freelancers") as any).insert({
        id: targetId,
        ...payload,
      });
    }
  }
}

// ── Hook: Save Freelancer Contract Field Values ─────────────────────────────────
export function useSaveFreelancerContractFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      values,
      requiredVariables,
    }: {
      freelancerId: string;
      values: Record<string, string>;
      requiredVariables: ContractModelVariable[];
    }) => {
      // Check if all deduplicated variables have non-empty values
      const isComplete =
        requiredVariables.length > 0 &&
        requiredVariables.every((v) => (values[v.name] ?? "").trim().length > 0);

      const contractFieldsStatus = isComplete ? "completo" : "pendente";

      await upsertFreelancerRecord(freelancerId, {
        contract_field_values: values,
        contract_fields_status: contractFieldsStatus,
        updated_at: new Date().toISOString(),
      });

      return { isComplete, contractFieldsStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_contract_info", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
    },
  });
}

// ── Hook: Fetch Freelancer Uploaded Documents ─────────────────────────────────
export function useFreelancerDocuments(freelancerId?: string) {
  return useQuery({
    queryKey: ["freelancer_documents", freelancerId],
    enabled: !!freelancerId,
    queryFn: async (): Promise<FreelancerDocument[]> => {
      if (!freelancerId) return [];

      const candidateIds = await getRelatedFreelancerIds(freelancerId);

      let data: any[] = [];
      let error: any = null;

      // 1. Try candidateIds query
      const res = await (supabase.from("freelancer_documents") as any)
        .select("*")
        .in("freelancer_id", candidateIds)
        .order("uploaded_at", { ascending: false });

      data = res.data ?? [];
      error = res.error;

      // 2. If no data or error, fallback to querying all freelancer_documents
      if (error || data.length === 0) {
        const fallbackRes = await (supabase.from("freelancer_documents") as any)
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (!fallbackRes.error && fallbackRes.data) {
          data = fallbackRes.data.filter((d: any) => candidateIds.includes(d.freelancer_id));
        }
      }

      // Deduplicate docs by document_type (keeping most recent uploaded_at)
      const docMap = new Map<string, any>();
      data.forEach((doc: any) => {
        if (!docMap.has(doc.document_type)) {
          docMap.set(doc.document_type, doc);
        }
      });

      const docsWithUrls = Array.from(docMap.values()).map((doc: any) => {
        let public_url = null;
        if (doc.file_path) {
          const { data: urlData } = supabase.storage
            .from("freelancer-documents")
            .getPublicUrl(doc.file_path);
          public_url = urlData.publicUrl;
        }
        return {
          ...doc,
          public_url,
        } as FreelancerDocument;
      });

      return docsWithUrls;
    },
  });
}

// Helper: Check if document requirements are satisfied
export function checkRequiredDocumentsStatus(docs: FreelancerDocument[]): {
  isComplete: boolean;
  missing: string[];
} {
  const uploadedTypes = new Set(docs.map((d) => d.document_type));
  const missing: string[] = [];

  const hasIdentityDoc =
    uploadedTypes.has("documento_identidade_1") ||
    uploadedTypes.has("rg_frente") ||
    uploadedTypes.has("cnh");

  if (!hasIdentityDoc) {
    missing.push("Documento de Identidade (RG ou CNH)");
  }

  if (!uploadedTypes.has("comprovante_residencia")) {
    missing.push("Comprovante de Residência");
  }
  if (!uploadedTypes.has("situacao_cadastral_cpf")) {
    missing.push("Comprovante de Situação Cadastral do CPF");
  }

  const hasAntecedentes =
    uploadedTypes.has("certidao_antecedentes_criminais") &&
    docs.find((d) => d.document_type === "certidao_antecedentes_criminais")?.status === "aprovado";

  if (!hasAntecedentes) {
    missing.push("Certidão de Antecedentes Criminais");
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

// ── Hook: Upload Freelancer Document ─────────────────────────────────────────
export function useUploadFreelancerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      documentType,
      file,
      docSelectionType = "rg",
    }: {
      freelancerId: string;
      documentType: FreelancerDocumentType;
      file: File;
      docSelectionType?: "rg" | "cnh";
    }) => {
      // 1. File size limit check (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. O tamanho máximo permitido é 10MB.");
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${freelancerId}/${documentType}_${Date.now()}.${fileExt}`;

      // 2. Upload to Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("freelancer-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // 3. Upsert / Save record in freelancer_documents table
      let docRecord;
      const { data: existingDoc } = await (supabase.from("freelancer_documents") as any)
        .select("id")
        .eq("freelancer_id", freelancerId)
        .eq("document_type", documentType)
        .maybeSingle();

      if (existingDoc) {
        const { data, error } = await (supabase.from("freelancer_documents") as any)
          .update({
            file_path: uploadData.path,
            status: "pendente",
            review_notes: null,
            uploaded_at: new Date().toISOString(),
          })
          .eq("id", existingDoc.id)
          .select()
          .single();
        if (error) throw error;
        docRecord = data;
      } else {
        const { data, error } = await (supabase.from("freelancer_documents") as any)
          .insert({
            freelancer_id: freelancerId,
            document_type: documentType,
            file_path: uploadData.path,
            status: "pendente",
            review_notes: null,
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          // Fallback to upsert if insert had conflict
          const { data: fallbackData, error: upsertErr } = await (
            supabase.from("freelancer_documents") as any
          )
            .upsert(
              {
                freelancer_id: freelancerId,
                document_type: documentType,
                file_path: uploadData.path,
                status: "pendente",
                review_notes: null,
                uploaded_at: new Date().toISOString(),
              },
              { onConflict: "freelancer_id, document_type" },
            )
            .select()
            .single();
          if (upsertErr) throw upsertErr;
          docRecord = fallbackData;
        } else {
          docRecord = data;
        }
      }

      // 4. Check if all required docs are now uploaded and update freelancers.documents_status
      const { data: allDocs } = await (supabase.from("freelancer_documents") as any)
        .select("*")
        .eq("freelancer_id", freelancerId);

      const statusCheck = checkRequiredDocumentsStatus(allDocs ?? []);
      if (statusCheck.isComplete) {
        await upsertFreelancerRecord(freelancerId, {
          documents_status: "em_analise",
          updated_at: new Date().toISOString(),
        });
      }

      return docRecord as FreelancerDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_documents", variables.freelancerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["freelancer_contract_info", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
    },
  });
}

// ── Hook: Gestor Review Freelancer Document ─────────────────────────────────
export function useReviewFreelancerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      freelancerId,
      status,
      reviewNotes,
    }: {
      documentId: string;
      freelancerId: string;
      status: "aprovado" | "rejeitado";
      reviewNotes?: string;
    }) => {
      const candidateIds = await getRelatedFreelancerIds(freelancerId);

      // 1. Update document status & review notes
      const { error: docErr } = await (supabase.from("freelancer_documents") as any)
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (docErr) throw docErr;

      // 2. Fetch all documents for this freelancer across candidateIds to calculate global documents_status
      const { data: allDocs } = await (supabase.from("freelancer_documents") as any)
        .select("*")
        .in("freelancer_id", candidateIds);

      const docList: FreelancerDocument[] = allDocs ?? [];
      const hasRejected = docList.some((d) => d.status === "rejeitado");

      let globalDocStatus: "pendente" | "em_analise" | "aprovado" | "rejeitado" = "em_analise";

      if (hasRejected) {
        globalDocStatus = "pendente"; // Needs re-upload
      } else {
        const requiredCheck = checkRequiredDocumentsStatus(docList);
        const allApproved =
          requiredCheck.isComplete && docList.every((d) => d.status === "aprovado");

        if (allApproved) {
          globalDocStatus = "aprovado";
        } else {
          globalDocStatus = "em_analise";
        }
      }

      await upsertFreelancerRecord(freelancerId, {
        documents_status: globalDocStatus,
        updated_at: new Date().toISOString(),
      });

      return { globalDocStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_documents", variables.freelancerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["freelancer_contract_info", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
    },
  });
}

// ── Hook: Gestor Batch Review Freelancer Documents ───────────────────────────
export function useBatchReviewFreelancerDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      status,
      reviewNotes,
    }: {
      freelancerId: string;
      status: "aprovado" | "rejeitado";
      reviewNotes?: string;
    }) => {
      const candidateIds = await getRelatedFreelancerIds(freelancerId);

      const updatePayload: Record<string, any> = {
        status,
        reviewed_at: new Date().toISOString(),
      };

      if (status === "rejeitado") {
        updatePayload.review_notes = reviewNotes || null;
      } else if (status === "aprovado") {
        updatePayload.review_notes = null;
      }

      // Single bulk UPDATE query in PostgreSQL/Supabase
      const { error: docErr } = await (supabase.from("freelancer_documents") as any)
        .update(updatePayload)
        .in("freelancer_id", candidateIds);

      if (docErr) throw docErr;

      const globalDocStatus = status === "aprovado" ? "aprovado" : "rejeitado";

      await upsertFreelancerRecord(freelancerId, {
        documents_status: globalDocStatus,
        updated_at: new Date().toISOString(),
      });

      return { globalDocStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_documents", variables.freelancerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["freelancer_contract_info", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
    },
  });
}

// ── Hook: Submit all documents for Gestor Analysis ──────────────────────────────
export function useSubmitDocumentsForAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (freelancerId: string) => {
      await upsertFreelancerRecord(freelancerId, {
        documents_status: "em_analise",
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: (_, freelancerId) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_contract_info", freelancerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["freelancer_documents", freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Documentos enviados para análise do Gestor!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar documentos: ${e.message}`),
  });
}

// ── Hook: Fetch contracts generated for this freelancer ────────────────────────
export function useFreelancerGeneratedContracts(freelancerId?: string) {
  return useQuery({
    queryKey: ["freelancer_generated_contracts", freelancerId],
    enabled: !!freelancerId,
    queryFn: async () => {
      if (!freelancerId) return [];
      const { data, error } = await (supabase.from("generated_contracts") as any)
        .select(
          `
          *,
          project:projects(id, title, service_type),
          model:contract_models(id, name)
        `,
        )
        .eq("freelancer_id", freelancerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ── Hook: Upload signed contract by Freelancer ─────────────────────────────────
export function useUploadSignedContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contractId,
      freelancerId,
      file,
    }: {
      contractId: string;
      freelancerId: string;
      file: File;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `signed/${freelancerId}_${contractId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("contracts")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage.from("contracts").getPublicUrl(uploadData.path);
      const publicUrl = pubData.publicUrl;

      const { error: updateErr } = await (supabase.from("generated_contracts") as any)
        .update({
          signed_docx_path: publicUrl,
          status: "assinado_freelancer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (updateErr) throw updateErr;

      return { publicUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_generated_contracts", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["generated_contracts"] });
      toast.success("Contrato assinado enviado com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar contrato assinado: ${e.message}`),
  });
}

export function useUploadManagerContractPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contractId,
      freelancerId,
      file,
    }: {
      contractId: string;
      freelancerId: string;
      file: File;
    }) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("O arquivo deve ser um PDF.");
      }

      const filePath = `signed_pdfs/${freelancerId}_${contractId}_${Date.now()}.pdf`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("contract-generated")
        .upload(filePath, file, { upsert: true, contentType: "application/pdf" });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage.from("contract-generated").getPublicUrl(uploadData.path);
      const publicUrl = pubData.publicUrl;

      const { error: updateErr } = await (supabase.from("generated_contracts") as any)
        .update({
          pdf_path: uploadData.path,
          status: "aguardando_assinatura_freelancer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (updateErr) throw updateErr;

      return { publicUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["freelancer_generated_contracts", variables.freelancerId],
      });
      queryClient.invalidateQueries({ queryKey: ["generated_contracts"] });
      toast.success("Contrato em PDF enviado ao freelancer com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar contrato em PDF: ${e.message}`),
  });
}
