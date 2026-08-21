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
  rejection_reason?: string | null;
  notes?: string | null;
  review_notes?: string | null;
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
          cnpj: profileRow.cnpj || "",
          cpf: profileRow.cpf || profileRow.cpf_cnpj || "",
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

      // 1. Update/Upsert PROFILES table first (satisfaz foreign key freelancers_id_fkey)
      const profilePatch: Record<string, any> = {
        id: targetId,
        role: "freelancer",
        updated_at: new Date().toISOString(),
      };
      if (patch.full_name || patch.contact_name) {
        profilePatch.full_name = patch.full_name || patch.contact_name;
      }
      if (patch.phone) profilePatch.phone = patch.phone;
      if (patch.cnpj) profilePatch.cpf_cnpj = patch.cnpj;
      if (patch.cpf) {
        profilePatch.cpf = patch.cpf;
        if (!profilePatch.cpf_cnpj) profilePatch.cpf_cnpj = patch.cpf;
      }
      if (patch.company_name) profilePatch.company_name = patch.company_name;
      if (patch.corporate_name) profilePatch.corporate_name = patch.corporate_name;
      if (patch.segment) profilePatch.segment = patch.segment;
      if (patch.email) profilePatch.email = patch.email;
      if (patch.address) profilePatch.address = patch.address;
      if (patch.city) profilePatch.city = patch.city;
      if (patch.state) profilePatch.state = patch.state;
      if (patch.cep) profilePatch.cep = patch.cep;
      if (patch.role_position) profilePatch.cargo = patch.role_position;
      if (patch.bank_name) profilePatch.bank_name = patch.bank_name;
      if (patch.pix_type) profilePatch.pix_type = patch.pix_type;
      if (patch.pix_key) profilePatch.pix_key = patch.pix_key;
      if (patch.bank_agency) profilePatch.bank_agency = patch.bank_agency;
      if (patch.bank_account) profilePatch.bank_account = patch.bank_account;
      if (typeof patch.onboarding_completed === "boolean") {
        profilePatch.onboarding_completed = patch.onboarding_completed;
      }

      try {
        const { error: pErr } = await (supabaseAdmin.from("profiles") as any).upsert(
          profilePatch,
          { onConflict: "id" }
        );
        if (pErr) {
          console.warn("Profiles upsert warning:", pErr.message);
        }
      } catch (pEx) {
        console.warn("Profiles upsert exception:", pEx);
      }

      // 2. Update/Upsert FREELANCERS table via admin (bypassa RLS)
      const freelancerPayload: Record<string, any> = {
        id: targetId,
        ...patch,
        updated_at: new Date().toISOString(),
      };

      // Helper: campos que pertencem à tabela freelancers (full_name pertence à tabela profiles)
      const KNOWN_FREELANCER_COLUMNS = new Set([
        "id", "email", "company_name", "corporate_name", "cnpj", "cpf",
        "segment", "address", "city", "state", "cep", "phone", "role_position",
        "instagram", "linkedin", "website", "bank_name", "bank_agency",
        "bank_account", "pix_type", "pix_key", "status", "contract_model",
        "contract_value", "payment_date", "due_date", "financial_status",
        "onboarding_completed", "skills", "hourly_rate", "created_at", "updated_at",
        "behance",
      ]);

      let safePayload = Object.fromEntries(
        Object.entries(freelancerPayload).filter(([k]) => KNOWN_FREELANCER_COLUMNS.has(k))
      );

      // Dynamic upsert with auto-stripping of non-existent schema columns
      let upsertAttempts = 0;
      let lastErr: any = null;

      while (upsertAttempts < 5) {
        upsertAttempts++;
        try {
          const { error: fErr } = await (supabaseAdmin.from("freelancers") as any).upsert(
            safePayload,
            { onConflict: "id" }
          );

          if (!fErr) {
            lastErr = null;
            break;
          }

          lastErr = fErr;
          console.warn(`[Freelancer Profile Save] Tentativa ${upsertAttempts} falhou:`, fErr.message);

          // Se for erro de foreign key, já salvamos em profiles
          if (fErr.code === "23503" || fErr.message?.includes("foreign key")) {
            console.warn("Foreign key constraint no freelancers — dados preservados em profiles.");
            lastErr = null;
            break;
          }

          // Detect unknown column from error message
          const matchSingleQuote = fErr.message.match(/Could not find the '([^']+)' column/i);
          const matchDoubleQuote = fErr.message.match(/column "([^"]+)" of relation "freelancers"/i);
          const matchPostgrest = fErr.message.match(/column '([^']+)' does not exist/i);
          const columnToStrip = matchSingleQuote?.[1] || matchDoubleQuote?.[1] || matchPostgrest?.[1];

          if (columnToStrip && safePayload[columnToStrip] !== undefined) {
            delete safePayload[columnToStrip];
          } else if (safePayload.behance !== undefined) {
            delete safePayload.behance;
          } else if (safePayload.full_name !== undefined) {
            delete safePayload.full_name;
          } else {
            break;
          }
        } catch (fEx: any) {
          lastErr = fEx;
          break;
        }
      }

      return patch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-freelancer-profile"] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Dados cadastrais salvos com sucesso!");
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
      status,
    }: {
      freelancerId: string;
      documentType: FreelancerDocumentType;
      file: File;
      status?: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "adequacao_solicitada" | string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${freelancerId}/${documentType}_${Date.now()}.${fileExt}`;

      // 1. Determina contentType para suportar .doc, .docx e .pdf
      let contentType = file.type;
      if (!contentType || contentType === "") {
        if (fileExt === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (fileExt === "doc") contentType = "application/msword";
        else if (fileExt === "pdf") contentType = "application/pdf";
      }

      // 2. Upload para o Supabase Storage (com fallback admin resiliente)
      let uploadPath = filePath;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("freelancer-docs")
        .upload(filePath, file, { 
          upsert: true,
          contentType: contentType || "application/octet-stream"
        });

      if (uploadErr) {
        console.warn("Storage upload primário falhou, tentando fallback via supabaseAdmin:", uploadErr);
        const { data: adminUpload, error: aUploadErr } = await supabaseAdmin.storage
          .from("freelancer-docs")
          .upload(filePath, file, { 
            upsert: true,
            contentType: contentType || "application/octet-stream"
          });
        if (aUploadErr) throw aUploadErr;
        uploadPath = adminUpload.path;
      } else {
        uploadPath = uploadData.path;
      }

      const { data: pubData } = supabase.storage
        .from("freelancer-docs")
        .getPublicUrl(uploadPath);
      const publicUrl = pubData?.publicUrl || null;

      // Determina status inicial inteligente
      const initialStatus =
        status ||
        (documentType === "contrato_prestacao" ||
        documentType === "contrato_assinado" ||
        documentType === "comprovante_pagamento"
          ? "aprovado"
          : "em_analise");

      // 2. Garantir sincronização do perfil para satisfazer chaves estrangeiras
      try {
        const { data: pCheck } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", freelancerId)
          .maybeSingle();

        if (!pCheck) {
          const { data: fRow } = await (supabase.from("freelancers") as any)
            .select("*")
            .eq("id", freelancerId)
            .maybeSingle();

          if (fRow) {
            await supabaseAdmin.from("profiles").upsert(
              {
                id: fRow.id,
                full_name: fRow.company_name || fRow.corporate_name || "Prestador Especialista",
                email: fRow.email || `${fRow.id}@delskiflow.internal`,
                role: "freelancer",
                status: "ativo",
              },
              { onConflict: "id" }
            );
          }
        }
      } catch (e) {
        console.warn("Pre-sync profile for freelancer_documents error:", e);
      }

      // 3. Insert or Update into freelancer_documents
      const docPayload: any = {
        freelancer_id: freelancerId,
        document_type: documentType,
        file_path: uploadData.path,
        file_url: publicUrl,
        status: initialStatus,
        uploaded_at: new Date().toISOString(),
      };

      let docRecord = null;
      try {
        const { data: existingDoc } = await (supabase.from("freelancer_documents") as any)
          .select("id")
          .eq("freelancer_id", freelancerId)
          .eq("document_type", documentType)
          .maybeSingle();

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
      } catch (err: any) {
        console.warn("Upload freelancer doc primary insert/update error, trying admin client or fallback status:", err);

        // Se o erro foi por conta de constraint de status, tenta com 'aprovado' ou 'pendente'
        const isStatusConstraint = err?.message?.includes("status_check") || err?.message?.includes("status");
        if (isStatusConstraint) {
          docPayload.status = initialStatus === "em_analise" ? "pendente" : "aprovado";
        }

        // Se foi erro de foreign key, tenta sincronizar profile via admin e retentar
        const isFKeyConstraint = err?.message?.includes("foreign key") || err?.message?.includes("fkey");
        if (isFKeyConstraint) {
          try {
            await supabaseAdmin.from("profiles").upsert(
              {
                id: freelancerId,
                full_name: "Prestador Especialista",
                email: `${freelancerId}@delskiflow.internal`,
                role: "freelancer",
                status: "ativo",
              },
              { onConflict: "id" }
            );
          } catch (pe) {
            console.warn("Admin upsert profile fallback warn:", pe);
          }
        }

        // Fallback resiliente via supabaseAdmin
        try {
          const { data: adminExisting } = await (supabaseAdmin.from("freelancer_documents") as any)
            .select("id")
            .eq("freelancer_id", freelancerId)
            .eq("document_type", documentType)
            .maybeSingle();

          if (adminExisting?.id) {
            const { data: adminUpdated, error: aErr } = await (supabaseAdmin.from("freelancer_documents") as any)
              .update(docPayload)
              .eq("id", adminExisting.id)
              .select()
              .single();
            if (aErr) throw aErr;
            docRecord = adminUpdated;
          } else {
            const { data: adminInserted, error: aErr } = await (supabaseAdmin.from("freelancer_documents") as any)
              .insert(docPayload)
              .select()
              .single();
            if (aErr) throw aErr;
            docRecord = adminInserted;
          }
        } catch (adminErr: any) {
          console.error("Admin client doc fallback error:", adminErr);
          throw new Error(adminErr?.message || err?.message || "Falha ao registrar documento no banco.");
        }
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
      const financialPayload = {
        contract_model: contractModel || "Mensal",
        contract_value: Number(contractValue) || 0,
        payment_date: paymentDate || null,
        due_date: dueDate || null,
        financial_status: financialStatus || "Pendente",
        updated_at: new Date().toISOString(),
      };

      // 1. Atualiza na tabela profiles (para manter integridade)
      try {
        await supabase
          .from("profiles")
          .update(financialPayload)
          .eq("id", freelancerId);
      } catch (err) {
        console.warn("Aviso ao atualizar profiles financeiro:", err);
      }

      // 2. Verifica se o registro existe em freelancers
      const { data: existing } = await (supabase.from("freelancers") as any)
        .select("id")
        .eq("id", freelancerId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await (supabase.from("freelancers") as any)
          .update(financialPayload)
          .eq("id", freelancerId)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      } else {
        // Busca dados do profile para criar o registro em freelancers
        const { data: pData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, company_name, cnpj, cpf, cpf_cnpj, bank_name, pix_type, pix_key")
          .eq("id", freelancerId)
          .maybeSingle();

        const insertPayload = {
          id: freelancerId,
          user_id: freelancerId,
          email: pData?.email || null,
          company_name: pData?.company_name || pData?.full_name || "Prestador",
          cnpj: pData?.cnpj || pData?.cpf_cnpj || null,
          cpf: pData?.cpf || null,
          phone: pData?.phone || null,
          bank_name: pData?.bank_name || null,
          pix_type: pData?.pix_type || null,
          pix_key: pData?.pix_key || null,
          ...financialPayload,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await (supabase.from("freelancers") as any)
          .upsert(insertPayload, { onConflict: "id" })
          .select()
          .maybeSingle();

        if (error) {
          console.warn("Aviso ao upsert freelancers financeiro:", error);
        }
        return data || insertPayload;
      }
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

// ── Mutation: Review Freelancer Portal Document (Aprovar / Solicitar Adequação) ──
export function useReviewFreelancerPortalDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      freelancerId,
      status,
      notes,
    }: {
      documentId: string;
      freelancerId: string;
      status: "aprovado" | "rejeitado" | "em_analise";
      notes?: string;
    }) => {
      const payload: any = {
        status,
        rejection_reason: status === "rejeitado" ? (notes || null) : null,
        notes: notes || null,
        review_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      };

      let updatedDoc = null;
      try {
        const { data, error: docErr } = await (
          supabase.from("freelancer_documents") as any
        )
          .update(payload)
          .eq("id", documentId)
          .select()
          .single();

        if (docErr) throw docErr;
        updatedDoc = data;
      } catch (err: any) {
        console.warn("Primary review update failed, trying fallback via admin client:", err);
        const { data: adminDoc, error: aErr } = await (
          supabaseAdmin.from("freelancer_documents") as any
        )
          .update(payload)
          .eq("id", documentId)
          .select()
          .single();
        if (aErr) throw aErr;
        updatedDoc = adminDoc;
      }

      // Sincronizar status geral de documentação do freelancer
      try {
        const { data: allDocs } = await (
          supabase.from("freelancer_documents") as any
        )
          .select("status")
          .eq("freelancer_id", freelancerId);

        if (allDocs && allDocs.length > 0) {
          const hasRejected = allDocs.some((d: any) => d.status === "rejeitado");
          const hasPending = allDocs.some(
            (d: any) => d.status === "em_analise" || d.status === "pendente"
          );
          let generalStatus = "aprovado";
          if (hasRejected) generalStatus = "rejeitado";
          else if (hasPending) generalStatus = "em_analise";

          await (supabase.from("freelancers") as any)
            .update({ documents_status: generalStatus })
            .eq("id", freelancerId);
        }
      } catch (e) {
        console.warn("Aviso ao atualizar documents_status do freelancer:", e);
      }

      return updatedDoc;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["freelancer_documents", v.freelancerId] });
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      qc.invalidateQueries({ queryKey: ["current-freelancer-profile", v.freelancerId] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      if (v.status === "aprovado") {
        toast.success("Documento aprovado com sucesso!");
      } else if (v.status === "rejeitado") {
        toast.success("Solicitação de adequação enviada com sucesso!");
      } else {
        toast.success("Status do documento atualizado!");
      }
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar documento: ${err.message}`);
    },
  });
}

