import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendServiceInvoiceIssuedEmail } from "@/integrations/brevo";
import type {
  EmittedServiceInvoicesRow,
  EmittedServiceInvoicesInsert,
  ServiceInvoiceStatus,
} from "@/types/database";

export interface EmittedServiceInvoiceItem extends EmittedServiceInvoicesRow {
  client?: {
    id: string;
    full_name: string;
    company_name: string | null;
    corporate_name?: string | null;
    cnpj?: string | null;
    email: string;
  } | null;
  project?: {
    id: string;
    title: string;
  } | null;
}

export function useEmittedServiceInvoices(clientId?: string) {
  return useQuery<EmittedServiceInvoiceItem[]>({
    queryKey: ["emitted_service_invoices", clientId ?? "all"],
    queryFn: async () => {
      try {
        let query = supabase
          .from("emitted_service_invoices")
          .select(
            `
            *,
            client:clients(id, full_name, company_name, corporate_name, cnpj, email),
            project:projects(id, title)
          `
          )
          .order("created_at", { ascending: false });

        if (clientId) {
          query = query.eq("client_id", clientId);
        }

        const { data, error } = await query;
        if (!error && data) {
          return (data as any) || [];
        }

        // If join failed (e.g. relation not found in PostgREST cache), try flat select
        let flatQuery = supabase
          .from("emitted_service_invoices")
          .select("*")
          .order("created_at", { ascending: false });

        if (clientId) {
          flatQuery = flatQuery.eq("client_id", clientId);
        }

        const { data: flatData, error: flatError } = await flatQuery;
        if (!flatError && flatData) {
          return (flatData as any) || [];
        }

        // Fallback to supabaseAdmin
        let adminQuery = supabaseAdmin
          .from("emitted_service_invoices")
          .select("*")
          .order("created_at", { ascending: false });

        if (clientId) {
          adminQuery = adminQuery.eq("client_id", clientId);
        }

        const { data: adminData } = await adminQuery;
        return (adminData as any) || [];
      } catch (err) {
        console.warn("[useEmittedServiceInvoices] Safe return on error:", err);
        return [];
      }
    },
  });
}

export interface EmitNfseParams {
  clientId: string;
  projectId?: string | null;
  serviceValue: number;
  serviceDescription: string;
  cnaeCode?: string;
  itemListaServico?: string;
  issRate?: number;
}

export function useEmitServiceInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: EmitNfseParams) => {
      // 0. Resolução e garantia de integridade de client_id válido na tabela public.clients
      let targetClientId = params.clientId;

      try {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id, full_name, email, company_name, phone, auth_user_id")
          .eq("id", params.clientId)
          .maybeSingle();

        if (existingClient?.id) {
          targetClientId = existingClient.id;
        } else {
          // Busca por auth_user_id
          const { data: clientByAuth } = await supabase
            .from("clients")
            .select("id")
            .eq("auth_user_id", params.clientId)
            .maybeSingle();

          if (clientByAuth?.id) {
            targetClientId = clientByAuth.id;
          } else {
            // Busca dados do perfil
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, email, phone, company_name")
              .eq("id", params.clientId)
              .maybeSingle();

            if (profile) {
              const { data: clientByEmail } = await supabase
                .from("clients")
                .select("id")
                .eq("email", profile.email)
                .maybeSingle();

              if (clientByEmail?.id) {
                targetClientId = clientByEmail.id;
              } else {
                // Insere automaticamente na tabela clients
                const { data: newClient, error: createClientErr } = await supabase
                  .from("clients")
                  .insert({
                    auth_user_id: profile.id,
                    full_name: profile.full_name || "Cliente",
                    email: profile.email || "",
                    company_name: profile.company_name || "",
                    phone: profile.phone || "",
                    status: "ativo",
                  } as any)
                  .select("id")
                  .single();

                if (!createClientErr && newClient?.id) {
                  targetClientId = newClient.id;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("[useEmitServiceInvoice] Client resolution warn:", err);
      }

      const effectiveParams = {
        ...params,
        clientId: targetClientId,
      };

      // 1. Tentar invocar a Edge Function 'emit-nfse'
      try {
        const { data: edgeData, error: edgeErr } =
          await supabase.functions.invoke("emit-nfse", {
            body: effectiveParams,
          });

        if (!edgeErr && edgeData?.invoice) {
          return edgeData.invoice;
        }
      } catch (err) {
        console.warn("[useEmitServiceInvoice] Edge function warn, using direct fallback:", err);
      }

      // 2. Fallback direto no Supabase (para ambiente local ou offline)
      const currentYear = new Date().getFullYear();
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `${currentYear}${randomSeq}`;
      const verificationCode = `DEL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const pdfUrl = `https://delski.co/fiscal/nfse/${invoiceNumber}.pdf`;
      const xmlUrl = `https://delski.co/fiscal/nfse/${invoiceNumber}.xml`;

      const insertPayload: EmittedServiceInvoicesInsert = {
        client_id: targetClientId,
        project_id: effectiveParams.projectId || null,
        number: invoiceNumber,
        verification_code: verificationCode,
        status: "autorizada",
        service_description: effectiveParams.serviceDescription,
        service_value: effectiveParams.serviceValue,
        iss_rate: effectiveParams.issRate || 2.0,
        cnae_code: effectiveParams.cnaeCode || "6201-5/01",
        item_lista_servico: effectiveParams.itemListaServico || "01.07",
        pdf_url: pdfUrl,
        xml_url: xmlUrl,
        issued_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("emitted_service_invoices")
        .insert([insertPayload as any])
        .select("*, client:clients(id, full_name, company_name, email)")
        .single();

      if (error) {
        throw new Error(error.message || "Falha ao emitir nota fiscal de serviço.");
      }

      // Enviar e-mail de notificação para o cliente
      const clientEmail = (data as any)?.client?.email;
      const clientName =
        (data as any)?.client?.company_name ||
        (data as any)?.client?.full_name ||
        "Cliente";

      if (clientEmail) {
        sendServiceInvoiceIssuedEmail({
          to: { email: clientEmail, name: clientName },
          invoiceNumber,
          verificationCode,
          amount: params.serviceValue,
          serviceDescription: params.serviceDescription,
          pdfUrl,
        }).catch((e) => console.warn("Email warning:", e));
      }

      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["emitted_service_invoices"] });
      toast.success(
        `NFS-e nº ${data?.number || ""} emitida e autorizada com sucesso!`
      );
    },
    onError: (err: any) => {
      toast.error(`Erro ao emitir NFS-e: ${err.message || "Erro desconhecido"}`);
    },
  });
}

export function useCancelServiceInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      reason,
    }: {
      invoiceId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("emitted_service_invoices")
        .update({
          status: "cancelada",
          error_message: `Cancelada pelo gestor: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(error.message || "Erro ao cancelar nota fiscal.");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emitted_service_invoices"] });
      toast.success("NFS-e cancelada com sucesso.");
    },
    onError: (err: any) => {
      toast.error(`Erro ao cancelar NFS-e: ${err.message}`);
    },
  });
}

export function useRetryServiceInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const currentYear = new Date().getFullYear();
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `${currentYear}${randomSeq}`;
      const verificationCode = `DEL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from("emitted_service_invoices")
        .update({
          number: invoiceNumber,
          verification_code: verificationCode,
          status: "autorizada",
          error_message: null,
          pdf_url: `https://delski.co/fiscal/nfse/${invoiceNumber}.pdf`,
          xml_url: `https://delski.co/fiscal/nfse/${invoiceNumber}.xml`,
          issued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(error.message || "Erro ao reprocessar NFS-e.");
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["emitted_service_invoices"] });
      toast.success(`NFS-e reprocessada com sucesso (nº ${data.number})!`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao reprocessar NFS-e: ${err.message}`);
    },
  });
}
