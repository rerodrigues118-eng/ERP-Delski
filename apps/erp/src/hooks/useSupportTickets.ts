import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TicketStatus = "Aberto" | "Em Andamento" | "Resolvido";

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_name: string;
  sender_role: "gestor" | "cliente";
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  client_id?: string;
  project_id?: string | null;
  project_name?: string | null;
  client_name: string;
  client_email?: string;
  category?: string;
  subject: string;
  message: string;
  evidence_url?: string | null;
  priority?: "Baixa" | "Media" | "Alta" | "Critica" | string;
  responsible_name?: string;
  deadline_date?: string | null;
  resolution_date?: string | null;
  resolution_notes?: string | null;
  status: TicketStatus | string;
  created_at: string;
  updated_at?: string;
  replies?: TicketReply[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchRepliesMap(): Promise<Map<string, TicketReply[]>> {
  const repliesMap = new Map<string, TicketReply[]>();
  try {
    const { data: replies } = await (supabase.from("ticket_replies") as any)
      .select("*")
      .order("created_at", { ascending: true });
    (replies ?? []).forEach((r: any) => {
      const list = repliesMap.get(r.ticket_id) || [];
      list.push(r);
      repliesMap.set(r.ticket_id, list);
    });
  } catch {
    // replies são opcionais — falha silenciosa é aceitável aqui
  }
  return repliesMap;
}

// ── Query: Gestor — vê TODOS os chamados ──────────────────────────────────────
export function useSupportTickets() {
  return useQuery({
    queryKey: ["support_tickets"],
    staleTime: 0,
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data: tickets, error } = await (supabase.from("support_tickets") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // RLS está bloqueando — o usuário precisa rodar o SQL de migração
        console.error("[useSupportTickets] Erro ao buscar tickets (verifique RLS):", error.message);
        return [];
      }

      if (!tickets || tickets.length === 0) return [];

      const repliesMap = await fetchRepliesMap();
      return tickets.map((t: any) => ({
        ...t,
        replies: repliesMap.get(t.id) || [],
      })) as SupportTicket[];
    },
  });
}

// ── Query: Cliente — vê APENAS seus próprios chamados ─────────────────────────
export function useClientSupportTickets(clientId?: string, clientEmail?: string) {
  const emailLower = clientEmail?.toLowerCase().trim() || "";
  return useQuery({
    queryKey: ["support_tickets", "client", clientId || emailLower],
    enabled: !!(clientId || emailLower),
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<SupportTicket[]> => {
      let query = (supabase.from("support_tickets") as any).select("*");

      if (clientId && emailLower) {
        query = query.or(`client_id.eq.${clientId},client_email.ilike.${emailLower}`);
      } else if (clientId) {
        query = query.eq("client_id", clientId);
      } else if (emailLower) {
        query = query.ilike("client_email", emailLower);
      }

      const { data: tickets, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("[useClientSupportTickets] Erro ao buscar tickets do cliente:", error.message);
        return [];
      }

      if (!tickets || tickets.length === 0) return [];

      const repliesMap = await fetchRepliesMap();
      return tickets.map((t: any) => ({
        ...t,
        replies: repliesMap.get(t.id) || [],
      })) as SupportTicket[];
    },
  });
}

// ── Mutation: Gestor responde a um chamado ────────────────────────────────────
export function useSendTicketReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      message,
      senderName = "Gestor Delski",
      senderRole = "gestor",
      newStatus = "Em Andamento",
    }: {
      ticketId: string;
      message: string;
      senderName?: string;
      senderRole?: "gestor" | "cliente";
      newStatus?: TicketStatus;
    }) => {
      const replyData = {
        ticket_id: ticketId,
        sender_name: senderName,
        sender_role: senderRole,
        message,
        created_at: new Date().toISOString(),
      };

      const { error: replyErr } = await (supabase.from("ticket_replies") as any).insert([replyData]);
      if (replyErr) throw new Error(`Erro ao enviar resposta: ${replyErr.message}`);

      await (supabase.from("support_tickets") as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return { ticketId, message, newStatus };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_tickets", "client"] });
      toast.success("Resposta enviada com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Mutation: Atualizar status de chamado ─────────────────────────────────────
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { error } = await (supabase.from("support_tickets") as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
      return { ticketId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Mutation: Cliente abre novo chamado ───────────────────────────────────────
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      projectId,
      clientName,
      clientEmail,
      category = "Projeto",
      subject,
      message,
      evidenceUrl,
      priority = "Media",
    }: {
      clientId?: string;
      projectId?: string;
      clientName: string;
      clientEmail?: string;
      category?: string;
      subject: string;
      message: string;
      evidenceUrl?: string | null;
      priority?: "Baixa" | "Media" | "Alta" | "Critica";
    }) => {
      // Pega o userId autenticado
      let authUserId: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        authUserId = (userData as any)?.user?.id || null;
      } catch {
        // sem auth — continua sem user_id
      }

      const ticketData: any = {
        client_id: clientId || null,
        project_id: projectId || null,
        user_id: authUserId,
        created_by: authUserId,
        client_name: clientName,
        client_email: clientEmail?.toLowerCase().trim() || null,
        category,
        subject,
        message,
        priority,
        responsible_name: "Equipe Delski",
        status: "Aberto",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (evidenceUrl) {
        ticketData.evidence_url = evidenceUrl;
      }

      let insertedId: string | null = null;

      // 1. Tenta inserir com o payload completo
      const { data: inserted, error: insertError } = await (supabase.from("support_tickets") as any)
        .insert([ticketData])
        .select("id")
        .single();

      if (insertError) {
        // Se o erro for de coluna evidence_url inexistente no schema cache
        const isColumnError =
          insertError.message?.includes("evidence_url") ||
          insertError.message?.includes("schema cache") ||
          insertError.code === "PGRST204";

        if (isColumnError && ticketData.evidence_url) {
          // Faz fallback anexando a URL no corpo da mensagem para não perder o anexo
          const fallbackData = {
            ...ticketData,
            message: `${ticketData.message}\n\n📎 Anexo / Evidência: ${ticketData.evidence_url}`,
          };
          delete fallbackData.evidence_url;

          const { data: fallbackInserted, error: fallbackErr } = await (supabase.from("support_tickets") as any)
            .insert([fallbackData])
            .select("id")
            .single();

          if (fallbackErr) {
            throw new Error(
              fallbackErr.code === "42501"
                ? "Permissão negada pelo banco de dados. Solicite ao gestor que execute o script SQL de configuração de permissões."
                : `Erro ao abrir chamado: ${fallbackErr.message}`
            );
          }
          insertedId = fallbackInserted?.id || null;
        } else {
          throw new Error(
            insertError.code === "42501"
              ? "Permissão negada pelo banco de dados. Solicite ao gestor que execute o script SQL de configuração de permissões."
              : `Erro ao abrir chamado: ${insertError.message}`
          );
        }
      } else {
        insertedId = inserted?.id || null;
      }

      // Invalida caches para ambos gestor e cliente
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ["support_tickets", "client", clientId] });
      }
      if (clientEmail) {
        queryClient.invalidateQueries({ queryKey: ["support_tickets", "client", clientEmail.toLowerCase().trim()] });
      }

      return {
        id: insertedId || `ticket-${Date.now()}`,
        ...ticketData,
        replies: [],
      } as SupportTicket;
    },
    onSuccess: () => {
      toast.success("Chamado aberto com sucesso! O gestor foi notificado.");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });
}

// ── Mutation: Upload de evidência ──────────────────────────────────────────────
export function useUploadTicketEvidence() {
  return useMutation({
    mutationFn: async ({ file, clientId }: { file: File; clientId?: string }) => {
      const fileExt = file.name.split(".").pop();
      const folder = clientId || "public";
      const filePath = `tickets/${folder}/evidence_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(filePath);

      return pubData?.publicUrl || null;
    },
  });
}
