import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendDelegationEmail, sendOnboardingEmail } from "@/integrations/brevo";

export interface Candidatura {
  id: string;
  project_id: string;
  token: string;
  freelancer_name: string;
  freelancer_email: string;
  skills: string[] | null;
  availability_hours: number | null;
  portfolio_url: string | null;
  proposed_rate: number | null;
  experience_summary: string | null;
  considerations: string | null;
  notes: string | null;
  status: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado";
  score: number;
  created_at: string;
}

export interface SubmitCandidaturaInput {
  project_id: string;
  freelancer_name: string;
  freelancer_email: string;
  skills?: string[];
  availability_hours: number;
  portfolio_url?: string;
  proposed_rate?: number;
  experience_summary?: string;
  considerations?: string;
  notes?: string;
  score?: number;
}

export interface UpdateCandidaturaInput {
  id: string;
  freelancer_name?: string;
  freelancer_email?: string;
  availability_hours?: number;
  portfolio_url?: string;
  proposed_rate?: number;
  experience_summary?: string;
  considerations?: string;
  notes?: string;
}

// ── Query: Fetch candidaturas for a specific project ────────────────────────
export function useProjectCandidaturas(projectId: string) {
  return useQuery({
    queryKey: ["project_candidaturas", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_triage")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Candidatura[];
    },
  });
}

// ── Mutation: Submit new candidatura ───────────────────────────────────────
export function useSubmitCandidatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitCandidaturaInput) => {
      const { data, error } = await supabase
        .from("project_triage")
        .insert({
          ...input,
          status: "Enviado",
        })
        .select()
        .single();

      await supabase
        .from("projects")
        .update({ status: "Aguardando Candidaturas" })
        .eq("id", input.project_id)
        .in("status", ["Criado", "Solicitado", "Delegado", "Em Producao"]);
      if (error) throw error;
      return data as Candidatura;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["project_candidaturas", d.project_id] });
      toast.success("Sua candidatura foi enviada com sucesso ao Gestor!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar candidatura: ${e.message}`),
  });
}

// ── Mutation: Update existing candidatura ────────────────────────────────
export function useUpdateCandidatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCandidaturaInput) => {
      const { data, error } = await supabase
        .from("project_triage")
        .update({
          freelancer_name: input.freelancer_name,
          freelancer_email: input.freelancer_email,
          availability_hours: input.availability_hours,
          portfolio_url: input.portfolio_url,
          proposed_rate: input.proposed_rate,
          experience_summary: input.experience_summary,
          considerations: input.considerations,
          notes: input.notes,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Candidatura;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project_candidaturas", data.project_id] });
      toast.success("Candidatura atualizada com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar candidatura: ${e.message}`),
  });
}

// ── Mutation: Approve candidate & assign to project ────────────────────────
export function useApproveCandidato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidaturaId,
      projectId,
      projectTitle,
      freelancerName,
      freelancerEmail,
      proposedRate,
    }: {
      candidaturaId: string;
      projectId: string;
      projectTitle: string;
      freelancerName: string;
      freelancerEmail: string;
      proposedRate?: number;
    }) => {
      // 1. Update candidature status to 'Aprovado'
      const { error: triageErr } = await (supabase.from("project_triage") as any)
        .update({ status: "Aprovado" })
        .eq("id", candidaturaId);
      if (triageErr) throw triageErr;

      // 2. Check if a profile exists for this email, or create one as freelancer
      let freelancerId: string | null = null;
      const { data: existingProfile, error: existingProfileError } = await (
        supabase.from("profiles") as any
      )
        .select("id")
        .eq("email", freelancerEmail)
        .maybeSingle();

      if (existingProfileError) {
        throw existingProfileError;
      }

      if (existingProfile) {
        freelancerId = (existingProfile as any).id;
      } else {
        const newId = crypto.randomUUID();
        const { data: newProfile, error: profileErr } = await (supabase.from("profiles") as any)
          .insert({
            id: newId,
            full_name: freelancerName,
            email: freelancerEmail,
            role: "freelancer",
          })
          .select("id")
          .maybeSingle();

        if (profileErr) {
          const profileExists =
            String(profileErr.message).toLowerCase().includes("duplicate") ||
            String(profileErr.details || "")
              .toLowerCase()
              .includes("key (email)");

          if (profileExists) {
            const { data: recoveredProfile, error: recoveryErr } = await (
              supabase.from("profiles") as any
            )
              .select("id")
              .eq("email", freelancerEmail)
              .maybeSingle();

            if (recoveryErr) throw recoveryErr;
            if (!recoveredProfile) throw profileErr;
            freelancerId = (recoveredProfile as any).id;
          } else {
            throw profileErr;
          }
        } else {
          freelancerId = (newProfile as any)?.id ?? null;
        }
      }

      // 3. Link freelancer to project
      if (freelancerId) {
        await (supabase.from("project_freelancers") as any).delete().eq("project_id", projectId);

        await (supabase.from("project_freelancers") as any).insert({
          project_id: projectId,
          freelancer_id: freelancerId,
          status: "Aceito",
        });
      }

      // 4. Update project status to 'Em Producao' and update freelancer_cost
      const patchData: { status: string; freelancer_cost?: number } = { status: "Em Producao" };
      if (proposedRate) patchData.freelancer_cost = proposedRate;

      const { error: projErr } = await (supabase.from("projects") as any)
        .update(patchData)
        .eq("id", projectId);
      if (projErr) throw projErr;

      // 4.1 Create a pending expense record for the freelancer payment (automation)
      try {
        const expenseAmount = proposedRate ?? patchData.freelancer_cost ?? null;
        if (expenseAmount && freelancerId) {
          const { error: expErr } = await (supabase.from("project_expenses") as any).insert({
            project_id: projectId,
            description: `Pagamento a ${freelancerName} pela aprovação no projeto "${projectTitle}"`,
            amount: expenseAmount,
            category: "freelancer",
            status: "Pendente",
            freelancer_id: freelancerId,
          });
          if (expErr) console.warn("Não foi possível criar despesa automática:", expErr);
        }
      } catch (e) {
        console.warn("Erro na automação financeira ao aprovar candidato:", e);
      }

      // 5. Send notification email via Brevo API
      try {
        // generate a temporary password and send onboarding email
        const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
        await sendOnboardingEmail({
          to: { name: freelancerName, email: freelancerEmail },
          tempPassword,
          onboardingLink: `${window.location.origin}/auth`,
        });

        // also send a project delegation notice
        await sendDelegationEmail({
          to: { name: freelancerName, email: freelancerEmail },
          projectClient: projectTitle,
          projectId: projectId,
          publicLink: `${window.location.origin}/app/projects/${projectId}`,
        });
      } catch (e) {
        console.warn("[Brevo Warning] E-mail de notificação não pôde ser entregue:", e);
      }

      return { projectId, freelancerName, freelancerEmail };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["project_candidaturas", res.projectId] });
      qc.invalidateQueries({ queryKey: ["project", res.projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(
        `Candidato ${res.freelancerName} aprovado! Projeto movido para "Em Produção"; despesa pendente criada e e-mail enviado via Brevo.`,
      );
    },
    onError: (e: Error) => toast.error(`Erro ao aprovar candidato: ${e.message}`),
  });
}
