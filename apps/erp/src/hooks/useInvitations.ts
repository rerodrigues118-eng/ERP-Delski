import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invitation {
  id: string;
  token: string;
  organization_id: string;
  email: string;
  role: "gestor" | "freelancer" | "cliente";
  invited_by: string | null;
  status: "pendente" | "aceito" | "expirado";
  expires_at: string;
  created_at: string;
}

export interface CreateInvitationInput {
  email: string;
  role: "gestor" | "freelancer" | "cliente";
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching invitations:", error);
        return [];
      }
      return (data ?? []) as Invitation[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvitationInput) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          email: input.email.trim().toLowerCase(),
          role: input.role,
          invited_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      const inviteUrl = `${window.location.origin}/auth?token=${data.token}`;
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Convite gerado e link copiado para a área de transferência!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar convite: ${err.message}`);
    },
  });
}
