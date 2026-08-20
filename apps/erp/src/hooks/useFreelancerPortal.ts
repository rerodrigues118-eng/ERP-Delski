import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import type {
  FreelancersRow,
  FreelancersUpdate,
  FreelancerDocumentType,
  FreelancerDocumentsRow,
} from "@/types/database";
import { toast } from "sonner";

export interface FreelancerPortalDocumentItem extends FreelancerDocumentsRow {
  public_url?: string | null;
}

// ── Query: Current Logged-in Freelancer Profile ──────────────────────────────
export function useCurrentFreelancerProfile(userId?: string, userEmail?: string) {
  const emailLower = userEmail?.toLowerCase().trim() || "";

  return useQuery({
    queryKey: ["current-freelancer-profile", userId, emailLower],
    enabled: !!(userId || emailLower),
    queryFn: async () => {
      let freelancerRow: any = null;

      // 1. Fetch from freelancers table
      if (userId) {
        try {
          const { data } = await (supabase.from("freelancers") as any)
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          freelancerRow = data;
        } catch {}
      }

      if (!freelancerRow && emailLower) {
        try {
          const { data } = await (supabase.from("freelancers") as any)
            .select("*")
            .ilike("email", emailLower)
            .limit(1)
            .maybeSingle();
          freelancerRow = data;
        } catch {}
      }

      // 2. Fetch from profiles table (com fallback admin)
      let profileRow: any = null;
      if (userId) {
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          profileRow = pData;
        } catch {}

        if (!profileRow) {
          try {
            const { data: adminPData } = await supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            profileRow = adminPData;
          } catch {}
        }
      }

      if (!profileRow && emailLower) {
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", emailLower)
            .limit(1)
            .maybeSingle();
          profileRow = pData;
        } catch {}
      }

      // 3. Fallback merge
      if (!freelancerRow && profileRow) {
        freelancerRow = {
          id: profileRow.id,
          company_name: profileRow.company_name || "",
          corporate_name: profileRow.corporate_name || "",
          cnpj: profileRow.cpf_cnpj || profileRow.cnpj || "",
          segment: profileRow.segment || "",
          email: profileRow.email,
          phone: profileRow.phone || "",
          address: profileRow.address || "",
          city: profileRow.city || "",
          state: profileRow.state || "",
          cep: profileRow.cep || "",
          role_position: profileRow.cargo || "",
          instagram: profileRow.instagram || "",
          linkedin: profileRow.linkedin || "",
          website: profileRow.website || "",
          bank_name: profileRow.bank_name || "",
          pix_type: profileRow.pix_type || "",
          pix_key: profileRow.pix_key || "",
          bank_agency: profileRow.bank_agency || "",
          bank_account: profileRow.bank_account || "",
          onboarding_completed: profileRow.onboarding_completed || false,
          status: profileRow.status || "ativo",
          contract_model: profileRow.contract_model || "Mensal",
          contract_value: profileRow.contract_value || 0,
          payment_date: profileRow.payment_date || null,
          due_date: profileRow.due_date || null,
          financial_status: profileRow.financial_status || "Pendente",
          created_at: profileRow.created_at,
        };
      }

      if (!freelancerRow && !profileRow) {
        return null;
      }

      // 4. Fetch linked projects
      const resolvedId = freelancerRow?.id || profileRow?.id || userId;
      let projects: any[] = [];

      try {
        const { data: projFreelancers } = await (
          supabase.from("project_freelancers") as any
        )
          .select(
            `
            id,
            status,
            projects:project_id (
              id,
              title,
              service_type,
              status,
              deadline,
              budget,
              briefing_content,
              google_drive_link,
              created_at
            )
          `
          )
          .eq("freelancer_id", resolvedId);

        if (projFreelancers) {
          projects = projFreelancers
            .filter((pf: any) => pf.projects)
            .map((pf: any) => ({
              ...pf.projects,
              assignment_status: pf.status,
            }));
        }
      } catch (err) {
        console.warn("Error fetching freelancer projects:", err);
      }

      return {
        ...freelancerRow,
        id: freelancerRow?.id || profileRow?.id || userId,
        email: freelancerRow?.email || profileRow?.email || "",
        full_name: profileRow?.full_name || freelancerRow?.full_name || "Prestador",
        avatar_url: profileRow?.avatar_url || null,
        projects,
      };
    },
  });
}

// ── Mutation: Update Current Freelancer Cadastral & Bank Data ────────────────
export function useUpdateCurrentFreelancerProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      userId,
      patch,
    }: {
      freelancerId?: string;
      userId?: string;
      patch: Record<string, any>;
    }) => {
      const targetId = freelancerId || userId;
      if (!targetId) throw new Error("ID do freelancer não especificado.");

      // 1. Update/Upsert freelancers table
      const { error: fErr } = await (supabase.from("freelancers") as any).upsert({
        id: targetId,
        ...patch,
        updated_at: new Date().toISOString(),
      });

      if (fErr) console.warn("Error upserting freelancers:", fErr);

      // 2. Update profiles table
      const profilePatch: any = {};
      if (patch.full_name || patch.contact_name) {
        profilePatch.full_name = patch.full_name || patch.contact_name;
      }
      if (patch.phone) profilePatch.phone = patch.phone;
      if (typeof patch.onboarding_completed === "boolean") {
        profilePatch.onboarding_completed = patch.onboarding_completed;
      }

      if (Object.keys(profilePatch).length > 0 && (userId || targetId)) {
        await supabase
          .from("profiles")
          .update(profilePatch)
          .eq("id", userId || targetId);
      }

      return patch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-freelancer-profile"] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Dados cadastrais e bancários atualizados com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar dados: ${e.message}`),
  });
}

// ── Query: Fetch Freelancer Portal Documents ─────────────────────────────────
export function useFreelancerPortalDocuments(freelancerId?: string) {
  return useQuery({
    queryKey: ["freelancer_documents", freelancerId],
    enabled: !!freelancerId,
    queryFn: async (): Promise<FreelancerPortalDocumentItem[]> => {
      if (!freelancerId) return [];

      let rawDocs: any[] = [];

      try {
        const { data, error } = await (supabase.from("freelancer_documents") as any)
          .select("*")
          .eq("freelancer_id", freelancerId);

        if (!error && data) {
          rawDocs = data;
        }
      } catch (error) {
        console.warn("Erro ao buscar freelancer_documents:", error);
      }

      if (rawDocs.length === 0) {
        try {
          const { data: adminDocs } = await (supabaseAdmin.from("freelancer_documents") as any)
            .select("*")
            .eq("freelancer_id", freelancerId);
          if (adminDocs) {
            rawDocs = adminDocs;
          }
        } catch {}
      }

      // Ordena em memória por uploaded_at ou created_at
      rawDocs.sort((a, b) => {
        const tA = new Date(a.uploaded_at || a.created_at || 0).getTime();
        const tB = new Date(b.uploaded_at || b.created_at || 0).getTime();
        return tB - tA;
      });

      return rawDocs.map((doc: any) => {
        let public_url = doc.file_url;
        if (!public_url && doc.file_path) {
          const { data: pub } = supabase.storage
            .from("freelancer-docs")
            .getPublicUrl(doc.file_path);
          public_url = pub?.publicUrl || null;
        }
        return {
          ...doc,
          public_url,
        };
      });
    },
  });
}

// ── Mutation: Upload Freelancer Document ─────────────────────────────────────
export function useUploadFreelancerPortalDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      documentType,
      file,
    }: {
      freelancerId: string;
      documentType: FreelancerDocumentType;
      file: File;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${freelancerId}/${documentType}_${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("freelancer-docs")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from("freelancer-docs")
        .getPublicUrl(uploadData.path);
      const publicUrl = pubData?.publicUrl || null;

      // 2. Insert or Update into freelancer_documents (usando apenas colunas existentes no schema)
      const docPayload = {
        freelancer_id: freelancerId,
        document_type: documentType,
        file_path: uploadData.path,
        status: "em_analise",
        uploaded_at: new Date().toISOString(),
      };

      const { data: existingDoc } = await (supabase.from("freelancer_documents") as any)
        .select("id")
        .eq("freelancer_id", freelancerId)
        .eq("document_type", documentType)
        .maybeSingle();

      let docRecord;
      if (existingDoc?.id) {
        const { data, error: docErr } = await (supabase.from("freelancer_documents") as any)
          .update(docPayload)
          .eq("id", existingDoc.id)
          .select()
          .single();
        if (docErr) throw docErr;
        docRecord = data;
      } else {
        const { data, error: docErr } = await (supabase.from("freelancer_documents") as any)
          .insert(docPayload)
          .select()
          .single();
        if (docErr) throw docErr;
        docRecord = data;
      }

      return docRecord;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["freelancer_documents", v.freelancerId] });
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      toast.success("Documento enviado para validação com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar documento: ${err.message}`);
    },
  });
}

// ── Mutation: Delete Freelancer Document ─────────────────────────────────────
export function useDeleteFreelancerPortalDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      filePath,
    }: {
      documentId: string;
      filePath?: string;
    }) => {
      if (filePath) {
        try {
          await supabase.storage.from("freelancer-docs").remove([filePath]);
        } catch (e) {
          console.warn("Storage delete warn:", e);
        }
      }

      const { error } = await (supabase.from("freelancer_documents") as any)
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      toast.success("Documento excluído.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir documento: ${err.message}`);
    },
  });
}

// ── Mutation: Upload Payment Receipt by Gestor ───────────────────────────────
export function useUploadFreelancerPaymentReceipt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      file,
      notes,
    }: {
      freelancerId: string;
      file: File;
      notes?: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `receipts/${freelancerId}/comprovante_${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("freelancer-docs")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from("freelancer-docs")
        .getPublicUrl(filePath);
      const fileUrl = pubData?.publicUrl || null;

      // 2. Insert into freelancer_documents
      const { error: docErr } = await (
        supabase.from("freelancer_documents") as any
      ).insert([
        {
          freelancer_id: freelancerId,
          document_type: "comprovante_pagamento",
          file_path: filePath,
          status: "aprovado",
          review_notes: notes || "Comprovante de pagamento bancário Delski",
          uploaded_at: new Date().toISOString(),
        },
      ]);

      if (docErr) throw docErr;

      return { filePath, fileUrl };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      qc.invalidateQueries({ queryKey: ["current-freelancer-profile"] });
      toast.success("Comprovante de pagamento anexado com sucesso!");
    },
    onError: (e: Error) =>
      toast.error(`Erro ao anexar comprovante: ${e.message}`),
  });
}

// ── Mutation: Update Freelancer Financial Terms (Gestor) ─────────────────────
export function useUpdateFreelancerFinancialTerms() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      contractModel,
      contractValue,
      paymentDate,
      dueDate,
      financialStatus,
    }: {
      freelancerId: string;
      contractModel?: string;
      contractValue?: number;
      paymentDate?: string | null;
      dueDate?: string | null;
      financialStatus?: string;
    }) => {
      const { data, error } = await (supabase.from("freelancers") as any)
        .update({
          contract_model: contractModel,
          contract_value: contractValue,
          payment_date: paymentDate || null,
          due_date: dueDate || null,
          financial_status: financialStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", freelancerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-freelancer-profile"] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Parâmetros financeiros do prestador salvos com sucesso!");
    },
    onError: (e: Error) =>
      toast.error(`Erro ao salvar parâmetros financeiros: ${e.message}`),
  });
}
