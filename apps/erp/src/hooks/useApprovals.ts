import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { sendApprovalStatusEmail } from "@/integrations/brevo";
import { toast } from "sonner";

export interface AccessRequestProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  phone?: string | null;
  cargo?: string | null;
}

export function useAccessRequests() {
  return useQuery({
    queryKey: ["access_requests"],
    queryFn: async () => {
      let profilesData: any[] = [];

      // 1. Tentar via client autenticado
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          profilesData = data;
        }
      } catch {
        // Fallback
      }

      // 2. Fallback via supabaseAdmin se necessário
      if (profilesData.length === 0) {
        try {
          const { data: adminData, error: adminErr } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

          if (!adminErr && adminData) {
            profilesData = adminData;
          }
        } catch {
          // Ignore
        }
      }

      return profilesData.map((p) => ({
        id: p.id,
        full_name: p.full_name || "Sem Nome",
        email: p.email || "",
        role: p.role || "freelancer",
        avatar_url: p.avatar_url,
        approval_status: (p.approval_status || "approved") as "pending" | "approved" | "rejected",
        created_at: p.created_at || new Date().toISOString(),
        phone: p.phone,
        cargo: p.cargo,
      })) as AccessRequestProfile[];
    },
  });
}

export function useApproveUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (user: { id: string; email: string; fullName: string; role?: string }) => {
      // 1. Atualiza no banco
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "approved" } as any)
        .eq("id", user.id);

      if (error) {
        // Fallback com admin
        const { error: adminErr } = await supabaseAdmin
          .from("profiles")
          .update({ approval_status: "approved" } as any)
          .eq("id", user.id);

        if (adminErr) throw adminErr;
      }

      // 2. Enviar e-mail de aprovação via Edge Function com fallback Brevo
      try {
        const res = await supabase.functions.invoke("send-approval-email", {
          body: {
            type: "approved",
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        });

        if (res.error) {
          console.warn("[useApproveUser] Edge function warning, trying Brevo direct fallback:", res.error);
          await sendApprovalStatusEmail({
            type: "approved",
            to: { email: user.email, name: user.fullName },
            role: user.role,
          });
        }
      } catch (emailErr) {
        console.warn("[useApproveUser] Direct Brevo call fallback:", emailErr);
        await sendApprovalStatusEmail({
          type: "approved",
          to: { email: user.email, name: user.fullName },
          role: user.role,
        }).catch((e) => console.warn("Email fallback failed:", e));
      }

      return user;
    },
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["access_requests"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success(`Acesso de ${user.fullName} aprovado com sucesso! E-mail de notificação enviado.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao aprovar acesso do usuário.");
    },
  });
}

export function useRejectUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; email: string; fullName: string; role?: string; reason?: string }) => {
      // 1. Atualiza no banco
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "rejected" } as any)
        .eq("id", payload.id);

      if (error) {
        // Fallback com admin
        const { error: adminErr } = await supabaseAdmin
          .from("profiles")
          .update({ approval_status: "rejected" } as any)
          .eq("id", payload.id);

        if (adminErr) throw adminErr;
      }

      // 2. Enviar e-mail de rejeição via Edge Function com fallback Brevo
      try {
        const res = await supabase.functions.invoke("send-approval-email", {
          body: {
            type: "rejected",
            email: payload.email,
            fullName: payload.fullName,
            role: payload.role,
            reason: payload.reason,
          },
        });

        if (res.error) {
          console.warn("[useRejectUser] Edge function warning, trying Brevo direct fallback:", res.error);
          await sendApprovalStatusEmail({
            type: "rejected",
            to: { email: payload.email, name: payload.fullName },
            role: payload.role,
            reason: payload.reason,
          });
        }
      } catch (emailErr) {
        console.warn("[useRejectUser] Direct Brevo call fallback:", emailErr);
        await sendApprovalStatusEmail({
          type: "rejected",
          to: { email: payload.email, name: payload.fullName },
          role: payload.role,
          reason: payload.reason,
        }).catch((e) => console.warn("Email fallback failed:", e));
      }

      return payload;
    },
    onSuccess: (payload) => {
      qc.invalidateQueries({ queryKey: ["access_requests"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.info(`Solicitação de ${payload.fullName} recusada.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao recusar acesso do usuário.");
    },
  });
}
