import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientDocumentType, ClientDocumentsRow } from "@/types/database";
import { toast } from "sonner";

export interface ClientDocumentItem extends ClientDocumentsRow {
  public_url?: string | null;
}

export function useClientDocuments(clientId?: string) {
  return useQuery({
    queryKey: ["client_documents", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientDocumentItem[]> => {
      if (!clientId) return [];

      const { data, error } = await (supabase.from("client_documents") as any)
        .select("*")
        .eq("client_id", clientId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.warn("Erro ao buscar client_documents:", error);
        return [];
      }

      const items: ClientDocumentItem[] = (data ?? []).map((doc: any) => {
        let public_url = doc.file_url;
        if (!public_url && doc.file_path) {
          const { data: pub } = supabase.storage
            .from("client-documents")
            .getPublicUrl(doc.file_path);
          public_url = pub?.publicUrl ?? null;
        }
        return {
          ...doc,
          public_url,
        };
      });

      return items;
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

      // 1. Upload to storage bucket client-documents
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(uploadData.path);
      const publicUrl = pubData?.publicUrl ?? null;

      // 2. Insert record in client_documents
      const { data: docRecord, error: docErr } = await (supabase.from("client_documents") as any)
        .insert({
          client_id: clientId,
          project_id: projectId || null,
          document_type: documentType,
          file_path: uploadData.path,
          file_url: publicUrl,
          status: "pendente",
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docErr) throw docErr;

      // 3. If uploading signed contract for a project, update projects table
      if (projectId && documentType === "contrato_assinado") {
        await (supabase.from("projects") as any)
          .update({
            client_contract_url: publicUrl,
            client_contract_path: uploadData.path,
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
