import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "manual" | "sistema" | "alerta";

export interface NotificationRow {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  created_by: string | null;
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useManualNotifications(createdBy?: string) {
  return useQuery({
    queryKey: ["notifications", "sent", createdBy],
    enabled: !!createdBy,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("created_by", createdBy)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useSendManualNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipients,
      title,
      message,
      createdBy,
    }: {
      recipients: string[];
      title: string;
      message: string;
      createdBy: string;
    }) => {
      if (!recipients.length) {
        throw new Error("Selecione pelo menos um destinatário.");
      }

      const payload = recipients.map((recipientId) => ({
        user_id: recipientId,
        title,
        message,
        type: "manual" as const,
        read: false,
        created_by: createdBy,
      }));

      const { error } = await supabase.from("notifications").insert(payload);
      if (error) throw error;

      return payload.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação enviada.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Falha ao enviar a notificação.");
    },
  });
}

export function useCreateSystemAlert() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      title,
      message,
    }: {
      userId: string;
      title: string;
      message: string;
    }) => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("title", title)
        .eq("message", message)
        .eq("type", "alerta")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        return null;
      }

      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type: "alerta",
        read: false,
        created_by: null,
      });

      if (insertError) throw insertError;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => {
      console.error("system alert creation failed", error);
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação removida.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover notificação.");
    },
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId?: string) => {
      if (!userId) {
        throw new Error("Usuário não identificado.");
      }
      const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas as notificações foram apagadas.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao limpar notificações.");
    },
  });
}
