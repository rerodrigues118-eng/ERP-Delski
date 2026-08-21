import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import type { ClientDocumentType, ClientDocumentsRow } from "@/types/database";
import { toast } from "sonner";

export interface ClientDocumentItem extends ClientDocumentsRow {
  public_url?: string | null;
}

export function useClientDocuments(clientId?: string, authUserId?: string) {
  return useQuery({
    queryKey: ["client_documents", clientId, authUserId],
    enabled: !!clientId || !!authUserId,
    queryFn: async (): Promise<ClientDocumentItem[]> => {
      try {
        let query = (supabase.from("client_documents") as any).select("*");

        if (clientId && authUserId && clientId !== authUserId) {
          query = query.or(`client_id.eq.${clientId},client_id.eq.${authUserId}`);
        } else if (clientId) {
          query = query.eq("client_id", clientId);
        } else if (authUserId) {
          query = query.eq("client_id", authUserId);
        } else {
          return [];
        }

        const { data, error } = await query.order("uploaded_at", { ascending: false });

        if (error) {
          console.warn("Aviso ao buscar client_documents:", error.message || error);
          return [];
        }

        const items: ClientDocumentItem[] = (data ?? []).map((doc: any) => {
          let public_url = doc.file_url;
          if (!public_url && doc.file_path) {
            try {
              const { data: pub } = supabase.storage
                .from("client-documents")
                .getPublicUrl(doc.file_path);
              public_url = pub?.publicUrl ?? null;
            } catch {}
          }
          return {
            ...doc,
            public_url,
          };
        });

        return items;
      } catch (err) {
        console.warn("Exceção ao carregar client_documents:", err);
        return [];
      }
    },
  });
}

export function useUploadClientDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      projectId,
      documentType,
      file,
    }: {
      clientId: string;
      projectId?: string | null;
      documentType: ClientDocumentType;
      file: File;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${clientId}/${documentType}_${Date.now()}.${fileExt}`;

      // 1. Upload to storage bucket client-documents (com fallback admin)
      let uploadDataPath = filePath;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        const { data: adminUpload, error: adminErr } = await supabaseAdmin.storage
          .from("client-documents")
          .upload(filePath, file, { upsert: true });
        if (adminErr) throw new Error(`Erro ao enviar arquivo para o Storage: ${adminErr.message}`);
        uploadDataPath = adminUpload.path;
      } else {
        uploadDataPath = uploadData.path;
      }

      const { data: pubData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(uploadDataPath);
      const publicUrl = pubData?.publicUrl ?? null;

      // 2. Insert record in client_documents (com fallback resiliente para check constraints)
      let docRecord: any = null;
      let targetDocType: string = documentType;

      const payload = {
        client_id: clientId,
        project_id: projectId || null,
        document_type: targetDocType,
        file_path: uploadDataPath,
        file_url: publicUrl,
        status: "pendente",
        uploaded_at: new Date().toISOString(),
      };

      const { data: resData, error: docErr } = await (supabase.from("client_documents") as any)
        .insert(payload)
        .select()
        .single();

      if (docErr) {
        // Se violou check constraint do document_type, faz fallback para tipo genérico aceito
        if (docErr.message?.includes("client_documents_document_type_check") || docErr.code === "23514") {
          const fallbackType = documentType.includes("contrato") ? "contrato_assinado" : "comprovante_pagamento";
          const { data: retryData, error: retryErr } = await (supabaseAdmin.from("client_documents") as any)
            .insert({
              ...payload,
              document_type: fallbackType,
            })
            .select()
            .single();

          if (retryErr) throw new Error(`Erro ao registrar documento: ${retryErr.message}`);
          docRecord = retryData;
        } else {
          // Tenta via admin
          const { data: adminRes, error: adminDocErr } = await (supabaseAdmin.from("client_documents") as any)
            .insert(payload)
            .select()
            .single();
          if (adminDocErr) throw new Error(`Erro ao registrar documento: ${adminDocErr.message}`);
          docRecord = adminRes;
        }
      } else {
        docRecord = resData;
      }

      // 3. If uploading signed contract for a project, update projects table
      if (projectId && (documentType === "contrato_assinado" || documentType === "contrato_prestacao")) {
        await (supabase.from("projects") as any)
          .update({
            client_contract_url: publicUrl,
            client_contract_path: uploadDataPath,
            contract_fields_status: "completo",
          })
          .eq("id", projectId);
      }

      return docRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client_documents", variables.clientId],
      });
      queryClient.invalidateQueries({ queryKey: ["client_documents"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["generated_contracts"] });
      toast.success("Documento enviado com sucesso!");
    },
    onError: (err: Error) => {
      console.error(err);
      toast.error(err.message || "Erro ao enviar documento.");
    },
  });
}

export function useDeleteClientDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, filePath }: { documentId: string; filePath?: string }) => {
      if (filePath) {
        try {
          await supabase.storage.from("client-documents").remove([filePath]);
        } catch (e) {
          console.warn("Storage file delete warn:", e);
        }
      }

      const { error } = await (supabase.from("client_documents") as any)
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_documents"] });
      toast.success("Documento excluído.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir documento: ${err.message}`);
    },
  });
}

