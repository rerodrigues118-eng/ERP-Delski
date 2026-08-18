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

const INITIAL_MOCK_TICKETS: SupportTicket[] = [];

const LOCAL_STORAGE_TICKETS_KEY = "delski_support_tickets_data";

function getStoredTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
    if (!raw) return INITIAL_MOCK_TICKETS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_TICKETS;
  }
}

function saveStoredTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error("Failed to save tickets in localStorage", err);
  }
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      try {
        const { data: tickets, error: ticketsErr } = await (supabase.from("support_tickets") as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (ticketsErr || !tickets || tickets.length === 0) {
          return getStoredTickets();
        }

        const { data: replies } = await (supabase.from("ticket_replies") as any)
          .select("*")
          .order("created_at", { ascending: true });

        const repliesMap = new Map<string, TicketReply[]>();
        (replies ?? []).forEach((r: any) => {
          const list = repliesMap.get(r.ticket_id) || [];
          list.push(r);
          repliesMap.set(r.ticket_id, list);
        });

        return tickets.map((t: any) => ({
          ...t,
          replies: repliesMap.get(t.id) || [],
        })) as SupportTicket[];
      } catch {
        return getStoredTickets();
      }
    },
  });
}

// ── Strict RBAC Isolated Query: Client Tickets ───────────────────────────────
export function useClientSupportTickets(clientId?: string, clientEmail?: string) {
  const emailLower = clientEmail?.toLowerCase().trim() || "";
  return useQuery({
    queryKey: ["support_tickets", "client", clientId || emailLower],
    enabled: !!(clientId || emailLower),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        let query = (supabase.from("support_tickets") as any).select("*");
        if (clientId) {
          query = query.or(`client_id.eq.${clientId},client_email.ilike.${emailLower}`);
        } else if (emailLower) {
          query = query.ilike("client_email", emailLower);
        }

        const { data: tickets, error: ticketsErr } = await query.order("created_at", {
          ascending: false,
        });

        if (ticketsErr || !tickets) {
          const stored = getStoredTickets();
          return stored.filter(
            (t) =>
              (clientId && t.client_id === clientId) ||
              (emailLower && t.client_email?.toLowerCase().trim() === emailLower),
          );
        }

        const { data: replies } = await (supabase.from("ticket_replies") as any)
          .select("*")
          .order("created_at", { ascending: true });

        const repliesMap = new Map<string, TicketReply[]>();
        (replies ?? []).forEach((r: any) => {
          const list = repliesMap.get(r.ticket_id) || [];
          list.push(r);
          repliesMap.set(r.ticket_id, list);
        });

        return tickets.map((t: any) => ({
          ...t,
          replies: repliesMap.get(t.id) || [],
        })) as SupportTicket[];
      } catch {
        return [];
      }
    },
  });
}

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
      const replyData: Partial<TicketReply> = {
        ticket_id: ticketId,
        sender_name: senderName,
        sender_role: senderRole,
        message,
        created_at: new Date().toISOString(),
      };

      try {
        const { error: replyErr } = await (supabase.from("ticket_replies") as any).insert([
          replyData,
        ]);
        if (!replyErr) {
          await (supabase.from("support_tickets") as any)
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", ticketId);
        }
      } catch (err) {
        console.warn("Supabase insert failed, fallback to local storage", err);
      }

      // Always update local storage as fallback
      const stored = getStoredTickets();
      const ticketIndex = stored.findIndex((t) => t.id === ticketId);
      if (ticketIndex !== -1) {
        const newReply: TicketReply = {
          id: `reply-${Date.now()}`,
          ticket_id: ticketId,
          sender_name: senderName,
          sender_role: senderRole,
          message,
          created_at: new Date().toISOString(),
        };
        stored[ticketIndex].replies = [...(stored[ticketIndex].replies || []), newReply];
        stored[ticketIndex].status = newStatus;
        stored[ticketIndex].updated_at = new Date().toISOString();
        saveStoredTickets(stored);
      }

      return { ticketId, message, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      try {
        await (supabase.from("support_tickets") as any)
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      } catch (err) {
        console.warn("Supabase ticket status update fallback", err);
      }

      const stored = getStoredTickets();
      const ticketIndex = stored.findIndex((t) => t.id === ticketId);
      if (ticketIndex !== -1) {
        stored[ticketIndex].status = status;
        stored[ticketIndex].updated_at = new Date().toISOString();
        saveStoredTickets(stored);
      }

      return { ticketId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
    },
  });
}

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
      // Ensure we record the authenticated user's id for user_id/created_by
      let authUserId: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        authUserId = (userData as any)?.user?.id || null;
      } catch (err) {
        console.warn("[useCreateTicket] failed to get auth user:", err);
      }

      // Verify profile exists for FK safety
      let profileExists = false;
      if (authUserId) {
        try {
          const { data: profileRow } = await (supabase.from("profiles") as any)
            .select("id")
            .eq("id", authUserId)
            .maybeSingle();
          if (profileRow && profileRow.id) profileExists = true;
        } catch (err) {
          console.warn("[useCreateTicket] failed to verify profile existence:", err);
        }
      }

      const ticketData: any = {
        client_id: clientId || null,
        project_id: projectId || null,
        user_id: profileExists ? authUserId : null,
        created_by: profileExists ? authUserId : null,
        client_name: clientName,
        client_email: clientEmail || null,
        category,
        subject,
        message,
        evidence_url: evidenceUrl || null,
        priority,
        responsible_name: "Equipe Delski",
        status: "Aberto",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { error } = await (supabase.from("support_tickets") as any)
          .insert([ticketData])
          .select("id");
        if (error) {
          console.error("[useCreateTicket] Error inserting ticket into Supabase:", error);
        } else {
          queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
          if (clientId) {
            queryClient.invalidateQueries({ queryKey: ["support_tickets", "client", clientId] });
          }
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
        }
      } catch (err: any) {
        console.error("[useCreateTicket] Exception creating ticket:", err);
      }

      const stored = getStoredTickets();
      const newTicket: SupportTicket = {
        id: `ticket-${Date.now()}`,
        ...ticketData,
        status: "Aberto",
        replies: [],
      };
      stored.unshift(newTicket);
      saveStoredTickets(stored);

      return newTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Ocorrência registrada com sucesso!");
    },
    onError: (e: Error) => {
      toast.error(`Erro ao registrar ocorrência: ${e.message}`);
    },
  });
}

// ── Mutation: Upload ticket evidence ─────────────────────────────────────────
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

