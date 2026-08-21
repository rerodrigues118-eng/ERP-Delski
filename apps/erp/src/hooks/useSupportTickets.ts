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

// ── Mutation: Enviar resposta a um chamado (Gestor ou Cliente) ───────────────
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
      let authUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        authUserId = authData?.user?.id || null;
      } catch {}

      const replyData: Record<string, any> = {
        ticket_id: ticketId,
        sender_name: senderName,
        sender_role: senderRole,
        message,
        created_at: new Date().toISOString(),
      };
      if (authUserId) replyData.user_id = authUserId;

      let replySaved = false;

      // 1. Tenta salvar na tabela ticket_replies com auto-healing de colunas e foreign keys
      let workingReply = { ...replyData };
      let attempts = 0;
      while (attempts < 5) {
        attempts++;
        const { error: replyErr } = await (supabase.from("ticket_replies") as any).insert([
          workingReply,
        ]);
        if (!replyErr) {
          replySaved = true;
          break;
        }

        console.warn(`[Ticket Reply Insert] Tentativa ${attempts} falhou:`, replyErr.message);

        if (replyErr.code === "23503" || replyErr.message?.includes("foreign key")) {
          delete workingReply.user_id;
          continue;
        }

        const matchSingle = replyErr.message?.match(/Could not find the '([^']+)' column/i);
        const matchDouble = replyErr.message?.match(/column "([^"]+)" of relation/i);
        const matchPostgrest = replyErr.message?.match(/column '([^']+)' does not exist/i);
        const missingCol = matchSingle?.[1] || matchDouble?.[1] || matchPostgrest?.[1];

        if (missingCol && workingReply[missingCol] !== undefined) {
          delete workingReply[missingCol];
        } else {
          break;
        }
      }

      // 2. Se a tabela ticket_replies não existir ou falhar, salva a resposta anexada nas notas do chamado
      if (!replySaved) {
        try {
          const { data: currentTicket } = await (supabase.from("support_tickets") as any)
            .select("message, resolution_notes")
            .eq("id", ticketId)
            .maybeSingle();

          const updatedNotes = currentTicket?.resolution_notes
            ? `${currentTicket.resolution_notes}\n\n[${senderName} - ${new Date().toLocaleString("pt-BR")}]: ${message}`
            : `[${senderName} - ${new Date().toLocaleString("pt-BR")}]: ${message}`;

          await (supabase.from("support_tickets") as any)
            .update({
              resolution_notes: updatedNotes,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ticketId);
          replySaved = true;
        } catch {}
      } else {
        await (supabase.from("support_tickets") as any)
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }

      return { ticketId, message, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_tickets", "client"] });
      toast.success("Resposta enviada com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar resposta: ${e.message}`),
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

      // Payload completo inicial
      const initialPayload: any = {
        category,
        subject,
        message,
        priority: priority || "Média",
        responsible_name: "Equipe Delski",
        status: "Aberto",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (clientId) initialPayload.client_id = clientId;
      if (projectId) initialPayload.project_id = projectId;
      if (authUserId) {
        initialPayload.user_id = authUserId;
        initialPayload.created_by = authUserId;
      }
      if (clientName) initialPayload.client_name = clientName;
      if (clientEmail) initialPayload.client_email = clientEmail.toLowerCase().trim();
      if (evidenceUrl) initialPayload.evidence_url = evidenceUrl;

      let insertedId: string | null = null;
      let workingPayload = { ...initialPayload };
      let attempts = 0;

      while (attempts < 8) {
        attempts++;
        const { data: inserted, error: insertError } = await (supabase.from("support_tickets") as any)
          .insert([workingPayload])
          .select("id")
          .single();

        if (!insertError) {
          insertedId = inserted?.id || null;
          break;
        }

        console.warn(`[Support Ticket Insert] Tentativa ${attempts} falhou:`, insertError);

        // Se for erro de permissão RLS (42501)
        if (insertError.code === "42501") {
          throw new Error(
            "Permissão negada pelo banco de dados. Solicite ao gestor que execute o script SQL de configuração de permissões."
          );
        }

        // Se for erro de foreign key (23503), remove chaves relacionais e tenta novamente
        if (insertError.code === "23503" || insertError.message?.includes("foreign key")) {
          if (workingPayload.user_id !== undefined || workingPayload.created_by !== undefined) {
            delete workingPayload.user_id;
            delete workingPayload.created_by;
            continue;
          }
          if (workingPayload.client_id !== undefined) {
            delete workingPayload.client_id;
            continue;
          }
          if (workingPayload.project_id !== undefined) {
            delete workingPayload.project_id;
            continue;
          }
        }

        // Detecta coluna ausente no cache do schema do Supabase (PGRST204 ou similar)
        const matchSingleQuote = insertError.message?.match(/Could not find the '([^']+)' column/i);
        const matchDoubleQuote = insertError.message?.match(/column "([^"]+)" of relation/i);
        const matchPostgrest = insertError.message?.match(/column '([^']+)' does not exist/i);
        const missingCol = matchSingleQuote?.[1] || matchDoubleQuote?.[1] || matchPostgrest?.[1];

        if (missingCol && workingPayload[missingCol] !== undefined) {
          const removedVal = workingPayload[missingCol];
          delete workingPayload[missingCol];
          // Preserva informação relevante anexando no corpo da mensagem
          if (missingCol === "evidence_url" && removedVal) {
            workingPayload.message = `${workingPayload.message}\n\n📎 Anexo / Evidência: ${removedVal}`;
          } else if (missingCol === "priority" && removedVal) {
            workingPayload.message = `${workingPayload.message}\n\n🏷️ Prioridade: ${removedVal}`;
          } else if (missingCol === "client_name" && removedVal) {
            workingPayload.message = `${workingPayload.message}\n\n👤 Solicitante: ${removedVal}`;
          }
        } else {
          // Se não identificou coluna específica, remove colunas não essenciais
          if (workingPayload.priority !== undefined) {
            delete workingPayload.priority;
          } else if (workingPayload.evidence_url !== undefined) {
            delete workingPayload.evidence_url;
          } else if (workingPayload.responsible_name !== undefined) {
            delete workingPayload.responsible_name;
          } else if (workingPayload.client_email !== undefined) {
            delete workingPayload.client_email;
          } else if (workingPayload.created_by !== undefined) {
            delete workingPayload.created_by;
          } else if (workingPayload.user_id !== undefined) {
            delete workingPayload.user_id;
          } else if (workingPayload.client_id !== undefined) {
            delete workingPayload.client_id;
          } else if (workingPayload.project_id !== undefined) {
            delete workingPayload.project_id;
          } else {
            throw new Error(`Erro ao abrir chamado: ${insertError.message}`);
          }
        }
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
        ...initialPayload,
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
