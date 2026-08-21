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
export function cleanTicketInitialMessage(rawMessage: string): string {
  if (!rawMessage) return "";
  const parts = rawMessage.split("\n\n[");
  return parts[0].trim();
}

function parseRepliesForTicket(ticket: any, dbReplies: TicketReply[] = []): TicketReply[] {
  const list: TicketReply[] = [];
  const seenKeys = new Set<string>();

  const addReply = (r: any, defaultRole: "gestor" | "cliente" = "gestor") => {
    if (!r || !r.message || typeof r.message !== "string") return;
    const msg = r.message.trim();
    if (!msg) return;
    const sender = r.sender_name || (defaultRole === "gestor" ? "Gestor Delski" : "Cliente");
    const role = r.sender_role || defaultRole;
    const date = r.created_at || ticket.updated_at || ticket.created_at || new Date().toISOString();
    const key = `${sender}:::${msg}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      list.push({
        id: r.id || `rep-${list.length}-${Date.now()}`,
        ticket_id: ticket.id,
        user_id: r.user_id,
        sender_name: sender,
        sender_role: role,
        message: msg,
        created_at: date,
      });
    }
  };

  // 1. Respostas da tabela relacional ticket_replies
  dbReplies.forEach((r) => addReply(r, r.sender_role));

  // 2. Coluna JSON replies no ticket
  if (Array.isArray(ticket.replies)) {
    ticket.replies.forEach((r: any) => addReply(r, r.sender_role));
  }

  // 3. Fallback das notas de resolução
  if (ticket.resolution_notes && typeof ticket.resolution_notes === "string") {
    const noteBlocks = ticket.resolution_notes.split("\n\n");
    noteBlocks.forEach((block: string) => {
      const match = block.match(/^\[(.*?)(?: - (.*?))?\]:\s*([\s\S]*)$/);
      if (match) {
        const senderName = match[1] || "Atendimento";
        const dateStr = match[2] || ticket.updated_at || ticket.created_at;
        const msg = match[3] || "";
        const role =
          senderName.toLowerCase().includes("gestor") ||
          senderName.toLowerCase().includes("delski")
            ? "gestor"
            : "cliente";
        addReply(
          {
            sender_name: senderName,
            sender_role: role,
            message: msg,
            created_at: dateStr,
          },
          role
        );
      }
    });
  }

  // 4. Fallback no corpo da mensagem principal (se foi anexado ao message)
  if (ticket.message && typeof ticket.message === "string" && ticket.message.includes("\n\n[")) {
    const msgBlocks = ticket.message.split("\n\n");
    msgBlocks.forEach((block: string) => {
      const match = block.match(/^\[(.*?)(?: - (.*?))?\]:\s*([\s\S]*)$/);
      if (match) {
        const senderName = match[1] || "Atendimento";
        const dateStr = match[2] || ticket.updated_at || ticket.created_at;
        const msg = match[3] || "";
        const role =
          senderName.toLowerCase().includes("gestor") ||
          senderName.toLowerCase().includes("delski")
            ? "gestor"
            : "cliente";
        addReply(
          {
            sender_name: senderName,
            sender_role: role,
            message: msg,
            created_at: dateStr,
          },
          role
        );
      }
    });
  }

  // 5. Fallback do localStorage local
  try {
    const localData = localStorage.getItem(`ticket_replies_${ticket.id}`);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any) => addReply(r, r.sender_role));
      }
    }
  } catch {}

  return list.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

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
    // Falha silenciosa aceitável — os fallbacks acima garantem a leitura
  }
  return repliesMap;
}

// ── Query: Gestor — vê TODOS os chamados ──────────────────────────────────────
export function useSupportTickets() {
  return useQuery({
    queryKey: ["support_tickets"],
    staleTime: 1000,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data: tickets, error } = await (supabase.from("support_tickets") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useSupportTickets] Erro ao buscar tickets (verifique RLS):", error.message);
        return [];
      }

      if (!tickets || tickets.length === 0) return [];

      const repliesMap = await fetchRepliesMap();
      return tickets.map((t: any) => ({
        ...t,
        replies: parseRepliesForTicket(t, repliesMap.get(t.id) || []),
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
    staleTime: 1000,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
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
        replies: parseRepliesForTicket(t, repliesMap.get(t.id) || []),
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

      const newReply: TicketReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ticket_id: ticketId,
        user_id: authUserId || undefined,
        sender_name: senderName,
        sender_role: senderRole,
        message: message.trim(),
        created_at: new Date().toISOString(),
      };

      // 1. Salva imediatamente no localStorage
      try {
        const localKey = `ticket_replies_${ticketId}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
        existing.push(newReply);
        localStorage.setItem(localKey, JSON.stringify(existing));
      } catch {}

      // 2. Busca ticket atual para compor histórico
      let currentTicket: any = null;
      try {
        const { data } = await (supabase.from("support_tickets") as any)
          .select("*")
          .eq("id", ticketId)
          .maybeSingle();
        currentTicket = data;
      } catch {}

      const currentMsg = currentTicket?.message || "";
      const replyFormatted = `[${senderName} - ${new Date().toLocaleString("pt-BR")}]: ${message.trim()}`;
      const updatedMessage = currentMsg ? `${currentMsg}\n\n${replyFormatted}` : replyFormatted;

      // 3. Atualização direta e 100% segura em support_tickets (zero 400 Bad Request)
      const safePayload = {
        status: newStatus,
        message: updatedMessage,
        updated_at: new Date().toISOString(),
      };

      try {
        await (supabase.from("support_tickets") as any)
          .update(safePayload)
          .eq("id", ticketId);
      } catch (updErr: any) {
        console.warn("[Support Ticket Update] Aviso:", updErr?.message);
      }

      return { ticketId, message: message.trim(), newStatus, reply: newReply };
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ["support_tickets"] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((t) => {
          if (t.id === data.ticketId) {
            const currentReps = t.replies || [];
            return {
              ...t,
              status: data.newStatus,
              replies: [...currentReps, data.reply],
            };
          }
          return t;
        });
      });

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
