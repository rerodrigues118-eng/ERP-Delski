import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Globe,
  Award,
  Send,
  Sparkles,
  Calendar,
  FileText,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useSubmitCandidatura } from "@/hooks/useTriage";
import { calculateFreelancerMatch } from "@/lib/matchmaking";
import { SERVICE_LABEL } from "@/mocks/types";

const candidaturaSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Endereço de e-mail inválido"),
  availabilityHours: z.coerce.number().min(1, "Informe as horas semanais disponíveis"),
  proposedRate: z.coerce.number().min(10, "Informe sua pretensão de valor (R$)"),
  portfolioUrl: z
    .string()
    .url("Insira uma URL válida (ex: https://github.com/...)")
    .or(z.literal("")),
  experienceSummary: z.string().min(10, "Descreva sua experiência relevante"),
  considerations: z.string().min(10, "Descreva suas considerações técnicas"),
});

type CandidaturaFormData = z.infer<typeof candidaturaSchema>;

export const Route = createFileRoute("/candidatura/$id")({
  head: () => ({
    meta: [
      { title: "Candidatura a Projeto — Delski ERP" },
      {
        name: "description",
        content: "Formulário público de triagem e candidatura para freelancers Delski.",
      },
    ],
  }),
  component: PublicCandidaturaPage,
});

function PublicCandidaturaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const submitCandidatura = useSubmitCandidatura();

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidaturaFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      availabilityHours: 20,
      proposedRate: 1500,
      portfolioUrl: "",
      experienceSummary: "",
      considerations: "",
    },
  });

  const onSubmit = (data: CandidaturaFormData) => {
    if (!project) return;

    // Calculate match score
    const match = calculateFreelancerMatch({
      projectServiceType: project.service_type,
      freelancerSkills: [project.service_type],
      availabilityHours: data.availabilityHours,
      hasPortfolio: Boolean(data.portfolioUrl),
      proposedRate: data.proposedRate,
      projectBudget: project.budget,
    });

    submitCandidatura.mutate(
      {
        project_id: project.id,
        freelancer_name: data.fullName,
        freelancer_email: data.email,
        skills: [project.service_type],
        availability_hours: data.availabilityHours,
        portfolio_url: data.portfolioUrl || undefined,
        proposed_rate: data.proposedRate,
        experience_summary: data.experienceSummary,
        considerations: data.considerations,
        notes: data.considerations,
        score: match.score,
      },
      {
        onSuccess: () => setSubmitted(true),
      },
    );
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-400">Carregando detalhes do briefing do projeto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-center">
          <CardContent className="py-10 space-y-4">
            <h2 className="text-xl font-bold text-white">Projeto Não Encontrado</h2>
            <p className="text-sm text-zinc-400">
              O link de candidatura expirou ou o projeto não existe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800 text-center shadow-2xl">
          <CardContent className="py-12 px-8 space-y-6">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-950/40"
              >
                Candidatura Enviada
              </Badge>
              <h1 className="text-2xl font-bold text-white">Obrigado pelo envio!</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Sua candidatura para o projeto{" "}
                <strong className="text-zinc-200">{project.title}</strong> foi registrada no painel
                do Gestor.
              </p>
            </div>
            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Vertical:</span>
                <span className="text-indigo-400 font-semibold">
                  {SERVICE_LABEL[project.service_type] || project.service_type}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Status da Seleção:</span>
                <span className="text-emerald-400 font-semibold">
                  Aguardando Avaliação do Gestor
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Em caso de aprovação, você receberá um e-mail oficial da Delski com os detalhes do
              projeto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg">
              D
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                DELSKI ERP · Oportunidade Freelancer
              </span>
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
            <Badge className="bg-indigo-600 text-white">
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
            {project.deadline && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                Prazo: {new Date(project.deadline).toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>
        </div>

        {/* Complete Briefing Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Briefing Completo do Projeto
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Examine o escopo e requisitos técnicos antes de enviar sua proposta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {project.briefing_content ||
                "Descrição do escopo em definição pelo gestor da agência."}
            </div>
          </CardContent>
        </Card>

        {/* Candidacy Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="pb-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Formulário de Triagem & Candidatura
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Preencha seus dados de disponibilidade, pretensão e considerações técnicas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Seu Nome Completo</Label>
              <Input
                placeholder="Ex: Carlos Silva"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-rose-400">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">E-mail de Contato</Label>
              <Input
                type="email"
                placeholder="seu.email@exemplo.com"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400" />
                Disponibilidade (Horas / Semana)
              </Label>
              <Input
                type="number"
                placeholder="20"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("availabilityHours")}
              />
              {errors.availabilityHours && (
                <p className="text-xs text-rose-400">{errors.availabilityHours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-400" />
                Pretensão de Valor (R$)
              </Label>
              <Input
                type="number"
                placeholder="1800"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("proposedRate")}
              />
              {errors.proposedRate && (
                <p className="text-xs text-rose-400">{errors.proposedRate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Experiência Relevante</Label>
            <Textarea
              rows={4}
              placeholder="Conte sua experiência anterior, stack e entregas semelhantes..."
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              {...register("experienceSummary")}
            />
            {errors.experienceSummary && (
              <p className="text-xs text-rose-400">{errors.experienceSummary.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Considerações</Label>
            <Textarea
              rows={4}
              placeholder="Compartilhe observações, riscos, abordagem e pontos importantes para o projeto..."
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              {...register("considerations")}
            />
            {errors.considerations && (
              <p className="text-xs text-rose-400">{errors.considerations.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-indigo-400" />
              Link do Portfólio / GitHub / LinkedIn (Opcional)
            </Label>
            <Input
              placeholder="https://github.com/seuusuario ou https://seuportfolio.com"
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              {...register("portfolioUrl")}
            />
            {errors.portfolioUrl && (
              <p className="text-xs text-rose-400">{errors.portfolioUrl.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitCandidatura.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
          >
            {submitCandidatura.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Enviar Candidatura ao Gestor
          </Button>
        </form>
      </div>
    </div>
  );
}
